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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e as string,
      });
    }
  }),
  signOut: protectedProcedure
    .input(
      z
        .object({
          logout_challenge: z.string().optional(),
          accepted: z.boolean(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (input?.logout_challenge) {
        let challenge;
        try {
          challenge = await ory.getOAuth2LogoutRequest({
            logoutChallenge: input.logout_challenge,
          });
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        if (input.accepted) {
          await auth.api.signOut({
            headers: ctx.headers,
          });
          return {
            message: "SUCCESS",
            data: await ory
              .acceptOAuth2LogoutRequest({
                logoutChallenge: input.logout_challenge,
              })
              .then((res) => res.data.redirect_to),
          };
        } else {
          await ory.rejectOAuth2LogoutRequest({
            logoutChallenge: input.logout_challenge,
          });
          return {
            message: "SUCCESS",
            data: new URL(
              challenge.data.request_url!,
              "https://accounts.bloxvalschools.com",
            ).searchParams.get("post_logout_redirect_uri")!,
          };
        }
      } else {
        const oryClients = await ory.listOAuth2Clients();
        if (!input) {
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
                    ...oryClients.data
                      .filter(
                        (c) =>
                          c.frontchannel_logout_uri &&
                          ctx.session.session.oryClientSessions.includes(
                            c.client_id!,
                          ),
                      )
                      .map((c) =>
                        fetch(c.frontchannel_logout_uri + "?sid=" + sid),
                      ),
                  ]),
              ),
            ]);
          } catch {}
        }

        if (input?.accepted) {
          await auth.api.signOut({
            headers: ctx.headers,
          });
        }
        return {
          message: "SUCCESS",
          data: "/portal",
        };
      }
    }),
});
