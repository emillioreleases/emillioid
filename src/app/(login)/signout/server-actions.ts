import { headers } from "next/headers";
import { auth } from "~/server/auth";
import { ory } from "~/utils/ory";

export async function oryLogout(logoutChallenge: string, choice: boolean) {
  "use server";
  const request = await ory.getOAuth2LogoutRequest({
    logoutChallenge: logoutChallenge,
  }).then((res) => res.data);
  if (!choice) {
    await ory
      .rejectOAuth2LogoutRequest({
        logoutChallenge: logoutChallenge,
      });
    return request.request_url;
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