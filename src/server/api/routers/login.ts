import { eq } from "drizzle-orm";
import ms from "ms";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type Context,
} from "~/server/api/trpc";
import {
  oauth2LoginAttempt,
  oauth2LoginSession,
} from "~/server/db/schema";

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

  loginUser: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const allowed = await canLogin(ctx, input);
      if (!allowed.verdict) {
        throw new Error("Invalid login");
      }

      const request = await ctx.db.query.oauth2LoginAttempt.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, input);
        },
      });

      if (!request) {
        throw new Error("Invalid login");
      }

      const ac = crypto.randomUUID();

      await ctx.db.batch([
        ctx.db.insert(oauth2LoginSession).values({
          id_token: null,
          access_token: null,
          refresh_token: null,
          at_expires_at: null,
          rt_expires_at: null,
          authorization_code: ac,
          ac_expires_at: new Date(new Date().getTime() + ms("60 seconds")),
          code_verifier: null,
          session_id: ctx.session.session.id,
          user_id: ctx.session.user.id,
          client_id: request.client_id,
          scope: request.scope,
          redirect_uri: request.redirect_uri,
          token_type: "Bearer",
          created_at: new Date(),
          updated_at: new Date(),
        }),
        ctx.db
          .delete(oauth2LoginAttempt)
          .where(eq(oauth2LoginAttempt.id, request.id)),
      ]);
      return request.redirect_uri+((request.redirect_uri.endsWith("?") ? "&" : "?")+"code="+ac+"&state="+request.state);
    }),
  requestBypass: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.headers.set("Set-Cookie", "bcps.auth.prompt-bypass=true; HttpOnly");
  }),
});
