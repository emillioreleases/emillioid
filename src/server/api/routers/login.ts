import type { OAuth2LoginRequest, RFC6749ErrorJson } from "@ory/client";
import type { AxiosError, AxiosResponse } from "axios";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type Context,
} from "~/server/api/trpc";
import { user } from "~/server/db/schema";
import { getOryLoginRequest } from "~/utils/get-login-request";
import { ory } from "~/utils/ory";

const canLogin = async (ctx: Context, input?: string) => {
  if (!ctx.session?.user)
    return {
      verdict: false,
      message: "NOT_LOGGED_IN",
    };

  let discord_direct = false;

  if (input) {
    let request;
    try {
      request = await getOryLoginRequest(input ?? "");
    } catch (e) {
      request = (e as AxiosError<RFC6749ErrorJson>).response;
    }

    if (request?.status !== 200) {
      return {
        verdict: false,
        message: "INVALID_LOGIN_CHALLENGE",
      };
    }

    request = request as AxiosResponse<OAuth2LoginRequest>;
    discord_direct =
      (
        request.data.client.metadata as
          | { discord_direct: boolean | undefined }
          | undefined
      )?.discord_direct ?? false;

    if (ctx.session.user.email.endsWith("@bloxvalschools.com")) {
      if (
        request.data.client.metadata &&
        !(request.data.client.metadata as { no_staff: boolean | undefined })
          .no_staff
      ) {
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

  getPrompt: publicProcedure.input(z.string()).query(async ({ input }) => {
    try {
      const loginRequest = await ory.getOAuth2LoginRequest({
        loginChallenge: input,
      })
      return new URL(
        (
          loginRequest
        ).data.request_url,
        "https://accounts.bloxvalschools.com",
      ).searchParams.get("prompt");
    } catch  {
      return null;
    }
  }),

  loginUser: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const allowed = await canLogin(ctx, input);
      let method;
      if (!allowed.verdict) {
        throw new Error("Invalid login");
      }

      if (ctx.session.user.email.endsWith("@students.bloxvalschools.com")) {
        if (!ctx.session.user.connectedRobloxAccount) {
          await ctx.db
            .update(user)
            .set({
              connectedRobloxAccount: ctx.session.user.email.split("@")[0],
              verifiedWanted: true,
            })
            .where(eq(user.id, ctx.session.user.id));
        }
        method = "roblox";
      } else {
        method = "discord";
        if (ctx.session.user.email.endsWith("@bloxvalschools.com")) {
          method = "myteam";
        }
      }

      const account = await ctx.db.query.account.findFirst({
        where(fields, operators) {
          return operators.eq(fields.userId, ctx.session.user.id);
        },
      });

      const subject =
        (method === "myteam"
          ? "myteam|" + account!.accountId
          : (allowed.message === "with_discord_direct"
            ? method + "|" + account!.accountId
            : "roblox|" + ctx.session.user.connectedRobloxAccount!));

      return await ory
        .acceptOAuth2LoginRequest({
          loginChallenge: input ?? "",
          acceptOAuth2LoginRequest: {
            aubjec,
            context: {
              login_method: method,
            },
            remember: true,
          },
        })
        .then((res) => res.data.redirect_to);
    }),
  requestBypass: protectedProcedure
    .mutation(async ({ ctx }) => {
      ctx.headers.set("Set-Cookie", "bcps.auth.prompt-bypass=true; HttpOnly");
    }),
});
