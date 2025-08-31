import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const oauth2Router = createTRPCRouter({
  getStage: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const request = await ctx.db.query.oauth2LoginAttempt.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, input);
      },
    });

    if (!request) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No request" });
    }

    if (!ctx.session?.session) {
      return "login";
    }

    const [client, consent] = await ctx.db.batch([
      ctx.db.query.oauth2Client.findFirst({
        columns: {
          with_discord_direct: true,
          with_no_staff: true,
          consentNeeded: true,
        },
        where(fields, operators) {
          return operators.eq(fields.id, request.client_id);
        },
      }),
      ctx.db.query.oauth2Consent.findFirst({
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.client_id, request.client_id),
            operators.eq(fields.user_id, ctx.session!.user.id),
          );
        },
      }),
    ]);

    if (client?.consentNeeded && !consent) {
      return "consent";
    }

    switch (request.prompt) {
      case "login":
        return "login";
      case "select_account":
        return "select_account";
      case "consent":
        return "consent";
      default:
        return "continue";
    }
  }),
  getClientDetails: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.query.oauth2LoginAttempt.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, input);
        },
      });

      if (!request) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No request" });
      }

      return await ctx.db.query.oauth2Client.findFirst({
        columns: {
          name: true,
          with_discord_direct: true,
          with_no_staff: true,
        },
        where(fields, operators) {
          return operators.eq(fields.id, request.client_id);
        },
      });
    }),
});
