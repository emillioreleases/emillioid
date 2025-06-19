import fetchUser from "~/app/(login)/consent/fetch-user";
import { ory } from "~/utils/ory";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { consentAccept } from "~/utils/accept-consent";
import { session } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const consentRouter = createTRPCRouter({
  getConsent: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const consent = await ory
        .getOAuth2ConsentRequest({
          consentChallenge: input,
        })
        .then((res) => res.data);
      if (!consent) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No consent" });
      }
      return consent;
    }),
  giveConsent: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const consent = await ory
        .getOAuth2ConsentRequest({
          consentChallenge: input,
        })
        .then((res) => res.data);
      if (!consent) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No consent" });
      }
      const user = await fetchUser(ctx, input);
      if (typeof user === "string") {
        throw new TRPCError({ code: "BAD_REQUEST", message: user });
      }
      if (consent.client?.frontchannel_logout_uri) {
        await ctx.db.update(session).set({
          oryClientSessions: JSON.stringify([
            ...(JSON.parse(ctx.session.session.oryClientSessions) as string[] ?? []).filter((s) => s !== consent.client?.client_id),
            consent.client?.client_id,
          ]),
        }).where(eq(session.id, ctx.session.session.id));
      }
      return await consentAccept(
        consent.challenge,
        user,
        consent.requested_scope!,
        consent.requested_access_token_audience!,
      );
    }),
  noConsent: protectedProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const consent = await ory
        .getOAuth2ConsentRequest({
          consentChallenge: input,
        })
        .then((res) => res.data);
      if (!consent) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No consent" });
      }
      return await ory
        .rejectOAuth2ConsentRequest({
          consentChallenge: input,
          rejectOAuth2Request: {
            error: "access_denied",
            error_description: "User denied access",
          },
        })
        .then((res) => res.data.redirect_to);
    }),
});
