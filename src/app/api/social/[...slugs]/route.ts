import "server-only";
import Elysia, { t } from "elysia";
import { ip } from "elysia-ip";
import * as client from "openid-client";
import { cacheTag, cacheLife } from "next/cache";
import { env } from "~/env";
import { db } from "~/server/db";
import { session, socialUsers, user, verification } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { CompactEncrypt } from "jose";

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
      cookie: { "emillioid.social-auth": socialAuth },
    }) => {
      const authn = await discover();
      if (!authn[idp])
        return new Response("Invalid identity provider", { status: 400 });
      let code_verifier: string = client.randomPKCECodeVerifier();
      let code_challenge: string =
        await client.calculatePKCECodeChallenge(code_verifier);
      let state: string = client.randomState();
      let nonce: string = client.randomNonce();

      let parameters: Record<string, string> = {
        redirect_uri: `${process.env.NODE_ENV == "production" ? "https" : "http"}://localhost:3000/api/social/${idp}/callback`,
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

      socialAuth.value = {
        code_challenge,
        state,
        nonce,
        idp,
      };

      socialAuth.set({
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        path: "/",
        maxAge: 30 * 60,
      });

      return Response.json({ redirectTo: redirectTo.toString() });
    },
    {
      cookie: t.Object({
        "emillioid.social-auth": t.Optional(
          t.Object({
            code_challenge: t.String(),
            state: t.String(),
            nonce: t.String(),
            idp: t.String(),
          }),
        ),
      }),
    },
  )
  .get(
    "/:idp/callback",
    async ({
      params: { idp },
      query,
      request,
      ip,
      headers,
      cookie: {
        "emillioid.is-linking": isLinking,
        "emillioid.social-auth": socialAuth,
        "emillioid.session": sessions,
        "emillioid.flow": flowToken,
      },
    }) => {
      const authn = await discover();
      if (!authn[idp])
        return new Response("Invalid identity provider", { status: 400 });

      if (!socialAuth || !socialAuth?.value || socialAuth.value.idp !== idp) {
        return new Response("No social auth in progress", { status: 400 });
      }

      const codeVerifier = await db.query.verification.findFirst({
        columns: {
          value: true,
        },
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, socialAuth.value!.state!),
            operators.eq(fields.identifier, socialAuth.value!.code_challenge),
          );
        },
      });

      if (!codeVerifier) {
        return new Response("Invalid or expired social auth session", {
          status: 400,
        });
      }

      try {
        await db
          .delete(verification)
          .where(
            and(
              eq(verification.id, socialAuth.value!.state!),
              eq(verification.identifier, socialAuth.value!.code_challenge),
            ),
          );
        const tokenRespond = await client.authorizationCodeGrant(
          authn[idp],
          new URL(request.url),
          {
            pkceCodeVerifier: codeVerifier.value,
            expectedState: socialAuth.value.state!,
            expectedNonce:
              idp !== "discord" ? socialAuth.value.nonce! : undefined,
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
          let userDb: typeof user.$inferSelect;
          if (!isLinking) {
            userDb = (await db.insert(user).values({}).returning())[0]!;
          } else {
            userDb = await db.query.user.findFirst({
              columns: {
                id: true,
              },
              where(fields, operators) {
                return operators.eq(fields.id, parseInt(sessions?.value!));
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

          uid = userDb[0]!.id;
        } else {
          if (isLinking) {
          } else {
          }
        }

        socialAuth.remove();


        const sid = crypto.randomUUID();

        const randomText =
          ip + "|" + headers["user-agent"] + "|" + uid + "|" + sid;
        const encryptedToken = await new CompactEncrypt(
          new TextEncoder().encode(randomText),
        )
          .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
          .encrypt(encryptSecret);

        const newSession = await db
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
          })
          .returning();

        sessions.value = encryptedToken;
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
        "emillioid.is-linking": t.Optional(t.Boolean()),
        "emillioid.social-auth": t.Optional(
          t.Object({
            code_challenge: t.String(),
            state: t.String(),
            nonce: t.String(),
            idp: t.String(),
          }),
        ),
        "emillioid.session": t.Optional(t.String()),
        "emillioid.flow": t.Optional(t.String()),
      }),
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
export type SocialLoginAPI = typeof app;
