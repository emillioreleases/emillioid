"use server";
import { headers } from "next/headers";
import { auth } from "~/server/auth";
import { ory } from "~/utils/ory";

export async function oryLogout(logoutChallenge: string, choice: boolean) {
  const request = await ory.getOAuth2LogoutRequest({
    logoutChallenge: logoutChallenge,
  }).then((res) => res.data);
  if (!choice) {
    await ory
      .rejectOAuth2LogoutRequest({
        logoutChallenge: logoutChallenge,
      });
    return new URL(request.request_url!, "https://accounts.bloxvalschools.com").searchParams.get("post_logout_redirect_uri"); 
  } else {
    const [oryLogoutAccept] = await Promise.all([
      ory
        .acceptOAuth2LogoutRequest({
          logoutChallenge: logoutChallenge,
        }),
      auth.api.signOut({
        headers: await headers(),
      })
    ]);

    return oryLogoutAccept.data.redirect_to;
  }
}