import { and, eq, or } from "drizzle-orm";
import { base64url, CompactEncrypt, SignJWT } from "jose";
import { z } from "zod";
import { env } from "~/env";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type Context,
} from "~/server/api/trpc";
import { auth } from "~/server/auth";
import { oauth2LoginAttempt, oauth2LoginSession } from "~/server/db/schema";
import { signOutApp } from "~/utils/signout-app";

export const canLogin = async (ctx: Context, input?: string) => {
  if (!ctx.session?.user)
    return {
      verdict: false,
      message: "NOT_LOGGED_IN",
    };

  let discord_direct = false;

  if (input) {
    const request = await ctx.db.query.oauth2LoginAttempt.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, input);
      },
    });

    if (!request) {
      return {
        verdict: false,
        message: "INVALID_LOGIN_CHALLENGE",
      };
    }

    const client = await ctx.db.query.oauth2Client.findFirst({
      columns: {
        with_discord_direct: true,
        with_no_staff: true,
      },
      where(fields, operators) {
        return operators.eq(fields.id, request.client_id);
      },
    });

    discord_direct = client?.with_discord_direct ?? false;

    if (ctx.session.user.email.endsWith("@bloxvalschools.com")) {
      if (!client?.with_no_staff) {
        return {
          verdict: true,
          message: "",
        };
      } else {
        return {
          verdict: false,
          message: "NO_STAFF",
        };
      }
    }
  }

  if (
    !discord_direct &&
    !ctx.session.user.connectedRobloxAccount &&
    !ctx.session.user.email.endsWith("@accounts.emillio.dev")
  ) {
    return {
      verdict: false,
      message: "NO_ROBLOX_ACCOUNT",
    };
  }

  return {
    verdict: true,
    message: discord_direct ? "with_discord_direct" : "",
  };
};

export const loginRouter = createTRPCRouter({
  canLogin: publicProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      return await canLogin(ctx, input);
    }),

  hasConnectedRobloxAccount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session.user.connectedRobloxAccount !== null;
  }),

  loginUser: protectedProcedure
    .input(
      z.object({
        loginChallenge: z.string(),
        forceRobloxAccount: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await canLogin(ctx, input.loginChallenge);
      if (!allowed.verdict) {
        throw new Error("Invalid login");
      }

      const request = await ctx.db.query.oauth2LoginAttempt.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, input.loginChallenge);
        },
      });

      if (!request) {
        throw new Error("Invalid login");
      }

      const client = await ctx.db.query.oauth2Client.findFirst({
        columns: {
          id: true,
          backchannelLogoutUri: true,
          jwtSigningAlgorithm: true,
          with_discord_direct: true,
          with_no_staff: true,
        },
        where(fields, operators) {
          return operators.eq(fields.id, request.client_id);
        },
      });

      if (!client) {
        throw new Error("Invalid login");
      }

      if (
        allowed.message === "with_discord_direct" &&
        typeof input.forceRobloxAccount !== "boolean"
      ) {
        throw new Error("Invalid login");
      }

      const ac = crypto.randomUUID();
      const encryptSecret = new TextEncoder().encode(
        env.OAUTH2_TOKEN_ENCRYPT_KEY,
      );
      const signSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_SIGN_KEY);
      const signedJWT = await new SignJWT({
        tid: ac,
        sid: request.id,
        sid2: request.id,
        tt: "authorization_code",
        ruri: request.redirect_uri,
      })
        .setIssuedAt()
        .setExpirationTime("60s")
        .setAudience(request.client_id)
        .setProtectedHeader({ alg: "HS512", typ: "JWT" })
        .sign(signSecret);

      const encryptedJWT = await new CompactEncrypt(
        new TextEncoder().encode(signedJWT),
      )
        .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
        .encrypt(encryptSecret);

      const deleteExistingSessions = await ctx.db
        .delete(oauth2LoginSession)
        .where(
          and(
            eq(oauth2LoginSession.session_id, ctx.session.session.id),
            eq(oauth2LoginSession.client_id, request.client_id),
          ),
        )
        .returning();

      await Promise.all(
        deleteExistingSessions.map((session) => signOutApp(session, client)),
      );

      await ctx.db.batch([
        ctx.db.insert(oauth2LoginSession).values({
          id_token: null,
          access_token: null,
          refresh_token: null,
          authorization_code: ac,
          code_verifier: null,
          session_id: ctx.session.session.id,
          user_id: ctx.session.user.id,
          client_id: request.client_id,
          scope: request.scope,
          redirect_uri: request.redirect_uri,
          token_type: "Bearer",
          created_at: new Date(),
          updated_at: new Date(),
          force_roblox_account:
            allowed.message !== "with_discord_direct"
              ? false
              : input.forceRobloxAccount,
        }),
        ctx.db
          .delete(oauth2LoginAttempt)
          .where(eq(oauth2LoginAttempt.id, request.id)),
      ]);
      return (
        request.redirect_uri +
        ((request.redirect_uri.endsWith("?") ? "&" : "?") +
          "code=" +
          base64url.encode(encryptedJWT) +
          "&state=" +
          request.state)
      );
    }),
  requestBypass: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.headers.set("Set-Cookie", "bcps.auth.prompt-bypass=true; HttpOnly");
  }),
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    const [session, ms] = await Promise.all([
      auth.api.getSession({
        headers: ctx.headers,
      }),
      auth.api.listDeviceSessions({
        headers: ctx.headers,
      }),
    ]);

    const sessions = [
      session!,
      ...ms.filter((ms) => ms.session.id !== session!.session.id),
    ];

    console.log(sessions);

    const oauth2Sessions = await ctx.db.query.oauth2LoginSession.findMany({
      where(fields, operators) {
        return operators.or(
          ...sessions.map((session) =>
            operators.eq(fields.session_id, session.session.id),
          ),
        );
      },
    });

    const oauth2Clients = await ctx.db.query.oauth2Client.findMany({
      columns: {
        id: true,
        jwtSigningAlgorithm: true,
        backchannelLogoutUri: true,
        with_discord_direct: true,
        with_no_staff: true,
      },
      where(fields, operators) {
        return operators.or(
          ...oauth2Sessions.map((s) => operators.eq(fields.id, s.client_id)),
        );
      },
    });

    await ctx.db
      .delete(oauth2LoginSession)
      .where(
        or(
          ...oauth2Sessions.map((loginSession) =>
            eq(oauth2LoginSession.id, loginSession.id),
          ),
        ),
      );

    await Promise.all(
      sessions.map(async () => {
        try {
          await Promise.all(
            oauth2Sessions.map((session) =>
              signOutApp(
                session,
                oauth2Clients.find((c) => c.id === session.client_id),
              ),
            ),
          );
        } catch {}
      }),
    );

    return await auth.api.signOut({
      headers: ctx.headers,
    });
  }),
});
