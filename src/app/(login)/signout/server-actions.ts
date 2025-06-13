"use server";
import { ory } from "~/utils/ory";

export async function oryLogout(logoutChallenge: string, choice: boolean) {
  const request = await ory
    .getOAuth2LogoutRequest({
      logoutChallenge: logoutChallenge,
    })
    .then((res) => res.data);
  if (!choice) {
    await ory.rejectOAuth2LogoutRequest({
      logoutChallenge: logoutChallenge,
    });
    return new URL(
      request.request_url!,
      "https://accounts.bloxvalschools.com",
    ).searchParams.get("post_logout_redirect_uri");
  } else {
    const oryLogoutAccept = await ory.acceptOAuth2LogoutRequest({
      logoutChallenge: logoutChallenge,
    });

    return oryLogoutAccept.data.redirect_to;
  }
}
