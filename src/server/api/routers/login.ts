import { eq } from "drizzle-orm";
import { base64url, CompactEncrypt, importJWK, SignJWT } from "jose";
import { z } from "zod";
import fetchUser from "~/app/(login)/consent/fetch-user";
import { env } from "~/env";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type Context,
} from "~/server/api/trpc";
import { oauth2LoginAttempt, oauth2LoginSession } from "~/server/db/schema";

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
    !ctx.session.user.email.endsWith("@students.bloxvalschools.com")
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
    .input(z.object({ loginChallenge: z.string(), forceRobloxAccount: z.boolean().optional() }))
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


      if (allowed.message === "with_discord_direct" && typeof input.forceRobloxAccount !== "boolean") {
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
          force_roblox_account: allowed.message !== "with_discord_direct" ? false : input.forceRobloxAccount,
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
    const oauth2Sessions = await ctx.db.query.oauth2LoginSession.findMany({
      where(fields, operators) {
        return operators.eq(fields.session_id, ctx.session.session.id);
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

    try {
      await Promise.all(
        oauth2Sessions.map(async (session) => {
          const client = oauth2Clients.find((c) => c.id === session.client_id);
          if (client?.backchannelLogoutUri) {
            const [key, account] = await ctx.db.batch([
              ctx.db.query.oauth2Keys.findFirst({
                columns: {
                  alg: true,
                  private_key: true,
                },
                where(fields, operators) {
                  return operators.eq(fields.alg, client.jwtSigningAlgorithm);
                },
              }),
              ctx.db.query.account.findFirst({
                columns: {
                  providerId: true,
                },
                where(fields, operators) {
                  return operators.eq(fields.userId, session.user_id);
                },
              }),
            ]);
            const jwtKey = await importJWK(key!.private_key, key?.alg);
            const yes = await fetchUser(session.user_id, account!.providerId, {
              discord_direct: client.with_discord_direct,
              no_staff: client.with_no_staff,
            });
            if (typeof yes === "string") {
              return;
            }
            const jwt = await new SignJWT({
              sid: session.session_id,
            })
              .setIssuedAt()
              .setAudience(client.id)
              .setSubject(yes.subject)
              .setIssuer("https://accounts.bloxvalschools.com")
              .setExpirationTime("30s")
              .sign(jwtKey);
            return fetch(client.backchannelLogoutUri, {
              body: jwt,
              method: "POST",
            });
          }
        }),
      );
    } catch {}
  }),
});
