import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";

export const accountManagementRouter = createTRPCRouter({
  linkAccountViaBloxlink: protectedProcedure.mutation(async ({ ctx }) => {
    const account = await db.query.account.findFirst({
      where(fields, operators) {
        return operators.eq(fields.userId, ctx.session.user.id);
      },
    });
    try {
      const bloxlinkFetch = (await fetch(
        `https://api.blox.link/v4/public/guilds/1034603516720844841/discord-to-roblox/${account!.accountId}`,
        { headers: { Authorization: "a95a4b98-58d7-4e82-bb23-6bf76d49cc64" } },
      ).then((response) => response.json() as Promise<{
        robloxID: string;
      }>));
      await ctx.db.update(user).set({
        connectedRobloxAccount: bloxlinkFetch.robloxID,
        verifiedWanted: true,
      }).where(eq(user.id, ctx.session.user.id));
    } catch (e) {
      console.log(e);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e as string });
    }
  }),
});
