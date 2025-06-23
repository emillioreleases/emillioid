import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { oauth2LoginAttempt, user } from "~/server/db/schema";

export const accountManagementRouter = createTRPCRouter({
  linkAccountViaBloxlink: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.account.findFirst({
        columns: {
          accountId: true,
        },
        where(fields, operators) {
          return operators.eq(fields.userId, ctx.session.user.id);
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No account or flow",
        });
      }

      await ctx.db
        .update(oauth2LoginAttempt)
        .set({
          promptBypass: true,
        })
        .where(eq(oauth2LoginAttempt.id, input));

      try {
        const bloxlinkFetch = await fetch(
          `https://api.blox.link/v4/public/guilds/1034603516720844841/discord-to-roblox/${account.accountId}`,
          {
            headers: { Authorization: "a95a4b98-58d7-4e82-bb23-6bf76d49cc64" },
          },
        ).then(
          (response) =>
            response.json() as Promise<{
              robloxID: string;
            }>,
        );
        await ctx.db
          .update(user)
          .set({
            connectedRobloxAccount: bloxlinkFetch.robloxID,
            verifiedWanted: true,
          })
          .where(eq(user.id, ctx.session.user.id));
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e as string,
        });
      }
    }),
});
