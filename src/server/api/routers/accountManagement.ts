import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { ory } from "~/utils/ory";

export const accountManagementRouter = createTRPCRouter({
  linkAccountViaBloxlink: protectedProcedure.mutation(async ({ ctx }) => {
    const account = await db.query.account.findFirst({
      where(fields, operators) {
        return operators.eq(fields.userId, ctx.session.user.id);
      },
    });
    try {
      const bloxlinkFetch = await fetch(
        `https://api.blox.link/v4/public/guilds/1034603516720844841/discord-to-roblox/${account!.accountId}`,
        { headers: { Authorization: "a95a4b98-58d7-4e82-bb23-6bf76d49cc64" } },
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
      console.log(e);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e as string,
      });
    }
  }),
  signOut: protectedProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      if (input) {
        try {
          await ory.getOAuth2LogoutRequest({
            logoutChallenge: input,
          });
        } catch (e) {
          console.log(e);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        return {
          message: "SUCCESS",
          data: await ory
            .acceptOAuth2LogoutRequest({
              logoutChallenge: input,
            })
            .then((res) => res.data.redirect_to)
        };
      } else {
        const oryClients = await ory.listOAuth2Clients();
        try {
          await Promise.all([
            auth.api.signOut({
              headers: ctx.headers,
            }),
            ...(JSON.parse(ctx.session.session.orySessions) as string[]).map(
              (sid: string) =>
                Promise.all([
                  ory.revokeOAuth2LoginSessions({
                    sid: sid,
                  }),
                ]),
            ),
          ]);
        } catch {}
        return {
          message: "SUCCESS",
          data: oryClients.data
            .filter(
              (c) =>
                c.frontchannel_logout_uri &&
                (
                  JSON.parse(ctx.session.session.oryClientSessions) as string[]
                ).includes(c.client_id!),
            )
            .map((c) => c.frontchannel_logout_uri),
        };
      }
    }),
});
