"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { session as sessions } from "~/server/db/schema";
import { ory } from "~/utils/ory";

export async function oryLogout(logoutChallenge: string, choice: boolean) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session) {
    return;
  }
  const request = await ory
    .getOAuth2LogoutRequest({
      logoutChallenge: logoutChallenge,
    })
    .then((res) => res.data);
  if (!choice) {
    db.update(sessions).set({
      oryClientSessions: JSON.stringify([
        ...(JSON.parse(session.session.oryClientSessions) as string[] ?? []).filter((s) => s !== logoutChallenge),
      ]),
    }).where(eq(sessions.id, session.session.id)); 
    await ory.rejectOAuth2LogoutRequest({
      logoutChallenge: logoutChallenge,
    });
    return new URL(
      request.request_url!,
      "https://accounts.bloxvalschools.com",
    ).searchParams.get("post_logout_redirect_uri");
  } else {
    const [oryLogoutAccept] = await Promise.all([
      ory.acceptOAuth2LogoutRequest({
        logoutChallenge: logoutChallenge,
      }),
      auth.api.signOut({ headers: await headers() }),
    ]);

    return oryLogoutAccept.data.redirect_to;
  }
}
