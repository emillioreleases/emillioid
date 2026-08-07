import "server-only";
import Elysia, { t } from "elysia";
import { ip } from "elysia-ip";
import * as client from "openid-client";
import { env } from "~/env";
import { db } from "~/server/db";
import { flowPopup, session, socialUsers, user, verification } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { CompactEncrypt, jwtVerify, SignJWT } from "jose";
import { CalculateNextStage } from "~/utils/calculate-next-stage";
import type { FlowAttestationPayload } from "~/utils/types";

const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);

async function discover(): Promise<Record<string, client.Configuration>> {
  const [roblox, discord] = await Promise.all([
    client.discovery(
      new URL("https://apis.roblox.com/oauth/.well-known/openid-configuration"),
      env.AUTH_ROBLOX_ID,
    ),
    client.discovery(
      new URL("https://discord.com/.well-known/openid-configuration"),
      env.AUTH_DISCORD_ID,
    ),
  ]);
  return { roblox, discord };
}

const app = new Elysia({ prefix: "/api/social" })
  .use(ip())
  .get(
    "/:idp/login",
    async ({
      body,
      params: { idp },
      redirect,
      cookie: { "emillioid.flow-attestation": flowAttestationCookie },
      headers,
    }) => {
      const authn = await discover();
      if (!authn[idp])
        return new Response("Invalid identity provider", { status: 400 });
      const existingToken = await jwtVerify(flowAttestationCookie?.value || "", new TextEncoder().encode(env.BETTER_AUTH_SECRET), { issuer: env.BETTER_AUTH_URL }).catch(() => null);
      if (!existingToken || !existingToken.payload)
        return new Response("Invalid or expired flow attestation", { status: 400 });
      let code_verifier: string = client.randomPKCECodeVerifier();
      let code_challenge: string =
        await client.calculatePKCECodeChallenge(code_verifier);
      let state: string = client.randomState();
      let nonce: string = client.randomNonce();

      let parameters: Record<string, string> = {
        redirect_uri: `${env.BETTER_AUTH_URL}/api/social/${idp}/callback`,
        scope: idp !== "discord" ? "openid profile" : "openid identify",
        state,
        nonce,
        code_challenge,
        code_challenge_method: "S256",
      };

      await db.insert(verification).values({
        id: state,
        identifier: code_challenge,
        value: code_verifier,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      let redirectTo: URL = client.buildAuthorizationUrl(
        authn[idp],
        parameters,
      );

      const payload = {
        ...(existingToken ? existingToken.payload : {}),
        social_auth: {
          code_challenge,
          state,
          nonce,
          idp,
        },
      };
      const token = await new SignJWT(payload)
        .setIssuedAt()
        .setExpirationTime("30m")
        .setIssuer(env.BETTER_AUTH_URL)
        .sign(new TextEncoder().encode(env.BETTER_AUTH_SECRET));

      flowAttestationCookie.set({
        value: token,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        path: "/",
        maxAge: 30 * 60,
      });

      if (!headers.referer?.startsWith(env.BETTER_AUTH_URL)) {
        return new Response("Invalid referer", { status: 400 });
      }

      const val = new URL(headers.referer);
      const flow = await db.query.flowPopup.findFirst({
        columns: {
          id: true,
        },
        where(fields, operators) {
          return operators.eq(fields.id, val.searchParams.get("flow")!);
        },
      });

      if (!flow) {
        return new Response("Invalid flow", { status: 400 });
      }

      return redirect(redirectTo.toString());
    },
    {
      headers: t.Object({
        "referer": t.String(),
      }),
      cookie: t.Object({
        "emillioid.flow-attestation": t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:idp/callback",
    async ({
      params: { idp },
      query,
      request,
      redirect,
      ip,
      headers,
      cookie: {
        "emillioid.session": sessions,
        "emillioid.flow-attestation": flowAttestationCookie
      },
    }) => {
      const authn = await discover();
      if (!authn[idp])
        return new Response("Invalid identity provider", { status: 400 });

      if (!flowAttestationCookie || !flowAttestationCookie.value) {
        return new Response("No flow attestation found", { status: 400 });
      }

      const verifyToken = await jwtVerify<FlowAttestationPayload>(
        flowAttestationCookie.value,
        new TextEncoder().encode(env.BETTER_AUTH_SECRET),
        {
          issuer: env.BETTER_AUTH_URL,
        }
      ).catch(() => null);

      if (!verifyToken || !verifyToken.payload) {
        return new Response("Invalid or expired flow attestation", {
          status: 400,
        });
      }

      if (!verifyToken.payload.social_auth || verifyToken.payload.social_auth.idp !== idp) {
        return new Response("No social auth in progress", { status: 400 });
      }

      const codeVerifier = await db.query.verification.findFirst({
        columns: {
          value: true,
        },
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, verifyToken.payload.social_auth!.state!),
            operators.eq(fields.identifier, verifyToken.payload.social_auth!.code_challenge),
          );
        },
      });

      if (!codeVerifier || !flowAttestationCookie || !flowAttestationCookie.value) {
        return new Response("Invalid or expired social auth session", {
          status: 400,
        });
      }


      try {
        await db
          .delete(verification)
          .where(
            and(
              eq(verification.id, verifyToken.payload.social_auth!.state!),
              eq(verification.identifier, verifyToken.payload.social_auth!.code_challenge),
            ),
          );
        const tokenRespond = await client.authorizationCodeGrant(
          authn[idp],
          new URL(request.url),
          {
            pkceCodeVerifier: codeVerifier.value,
            expectedState: verifyToken.payload.social_auth!.state!,
            expectedNonce:
              idp !== "discord" ? verifyToken.payload.social_auth!.nonce! : undefined,
          },
        );
        const userData = await fetch(
          authn[idp].serverMetadata().userinfo_endpoint!,
          {
            headers: {
              Authorization: `Bearer ${tokenRespond.access_token}`,
            },
          },
        ).then((res) =>
          res.json<{
            sub: string;
            preferred_name: string;
            name: string;
            picture: string;
          }>(),
        );

        const accountInDb = await db.query.socialUsers.findFirst({
          columns: {
            id: true,
            userId: true,
          },
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.accountId, userData.sub),
              operators.eq(fields.accountType, idp as "roblox" | "discord"),
            );
          },
        });

        let uid = accountInDb?.userId;

        if (!accountInDb) {
          let userDb: { id: string } | undefined;
          if (!verifyToken.payload.is_linking) {
            userDb = (
              await db.insert(user).values({}).returning({ id: user.id })
            )[0]!;
          } else {
            const session = await db.query.session.findFirst({
              columns: {
                userId: true,
              },
              where(fields, operators) {
                return operators.eq(fields.token, sessions?.value!);
              },
            });

            if (!session) {
              return new Response("No session found", { status: 400 });
            }

            userDb = await db.query.user.findFirst({
              columns: {
                id: true,
              },
              where(fields, operators) {
                return operators.eq(fields.id, session.userId);
              },
            });
          }

          await db.insert(socialUsers).values({
            userId: userDb!.id,
            accountId: userData.sub,
            accountType: idp as "roblox" | "discord",
            username: userData.preferred_name,
            display_name: userData.name,
            image: userData.picture,
          });

          uid = userDb!.id;
        } else {
          if (verifyToken.payload.is_linking) {
          } else {
          }
        }

        const sid = crypto.randomUUID();

        const randomText =
          ip + "|" + headers["user-agent"] + "|" + uid + "|" + sid;
        const encryptedToken = await new CompactEncrypt(
          new TextEncoder().encode(randomText),
        )
          .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
          .encrypt(encryptSecret);

        await db
          .insert(session)
          .values({
            createdAt: new Date(),
            updatedAt: new Date(),
            userAgent: headers["user-agent"]!,
            ipAddress: ip || "unknown",
            userId: uid!,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token: encryptedToken,
            id: sid,
          });

        sessions.value = encryptedToken;

        const flow = await db.query.flowPopup.findFirst({
          with: {
            client: true,
          },
          where(fields, operators) {
            return operators.eq(fields.id, verifyToken.payload.flow);
          },
        });
        
        const modifiedFlowData: typeof flow = {
          ...flow!,
          session_id: sid,
        }

        await db.update(flowPopup).set({ session_id: sid, status: await CalculateNextStage(modifiedFlowData, flow!.client!) }).where(eq(flowPopup.id, verifyToken.payload.flow));

        return redirect(`${env.BETTER_AUTH_URL}/signin?flow=${verifyToken.payload.flow}`);
      } catch (e) {
        console.error(e);
        return new Response("Failed to exchange code for token", {
          status: 500,
        });
      }
    },
    {
      query: t.Object({
        code: t.String(),
        state: t.String(),
      }),
      cookie: t.Object({
        "emillioid.session": t.Optional(t.String()),
        "emillioid.flow-attestation": t.Optional(t.String()),
      }),
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
export type SocialLoginAPI = typeof app;
