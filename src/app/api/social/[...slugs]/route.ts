import "server-only";
import Elysia, { t } from "elysia";
import * as client from "openid-client";
import { cacheTag, cacheLife } from "next/cache";
import { env } from "~/env";
import { db } from "~/server/db";
import { verification } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";

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

      let parameters: Record<string, string> = {
        redirect_uri: `${process.env.NODE_ENV == "production" ? "https" : "http"}://localhost:3000/api/social/${idp}/callback`,
        scope: idp !== "discord" ? "openid profile" : "openid identify",
        state,
        code_challenge,
        code_challenge_method: "S256",
      };

      await db.insert(verification).values({
        id: state,
        identifier: code_challenge,
        value: code_verifier,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      let redirectTo: URL = client.buildAuthorizationUrl(authn[idp], {
        ...parameters,
      });

      socialAuth.value = {
        code_challenge,
        state,
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
            idp: t.String(),
          }),
        ),
      }),
    },
  )
  .post("/:idp/post-login-action", ({ body }) => {}, {
    body: t.Object({}),
  })
  .get(
    "/:idp/callback",
    async ({
      params: { idp },
      query,
      request,
      cookie: { "emillioid.social-auth": socialAuth },
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
          },
        );
        const user = await fetch(
          authn[idp].serverMetadata().userinfo_endpoint!,
          {
            headers: {
              Authorization: `Bearer ${tokenRespond.access_token}`,
            },
          },
        ).then((res) => res.json());
        socialAuth.value = undefined;
        return user;
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
        "emillioid.social-auth": t.Optional(
          t.Object({
            code_challenge: t.String(),
            state: t.String(),
            idp: t.String(),
          }),
        ),
      }),
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
