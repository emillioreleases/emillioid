"use server";
import { ory } from "~/utils/ory";
import { jwtDecrypt, base64url } from "jose";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { headers } from "next/headers";

async function consentAccept(
  code_challenge: string,
  user: {
    method: string;
    email: string;
    name: string;
    preferred_username: string;
    picture: string;
    groups: string[];
  },
  scopes: string[],
  audience: string[],
) {
  return await ory
    .acceptOAuth2ConsentRequest({
      consentChallenge: code_challenge,
      acceptOAuth2ConsentRequest: {
        session: {
          id_token: {
            login_method: user.method,
            email: user.email,
            name: user.name,
            display_name:
              user.method === "roblox" || user.method === "discord"
                ? user.name.split(" ")[0]
                : user.name,
            preferred_username: user.preferred_username,
            picture: user.picture,
            groups: user.groups,
          },
          access_token: {
            login_method: user.method,
            email: user.email,
            name: user.name,
            display_name:
              user.method === "roblox" || user.method === "discord"
                ? user.name.split(" ")[0]
                : user.name,
            preferred_username: user.preferred_username,
            picture: user.picture,
            groups: user.groups,
          },
        },
        grant_scope: scopes,
        grant_access_token_audience: audience,
      },
    })
    .then((res) => res.data.redirect_to);
}

export async function giveConsent(
  code_challenge: string,
  user_jwt: string,
  scopes: string[],
  audience: string[],
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session) {
    throw new Error("No session");
  }
  const user = await jwtDecrypt<{
    method: string;
    email: string;
    name: string;
    preferred_username: string;
    picture: string;
    groups: string[];
  }>(user_jwt, base64url.decode(env.BETTER_AUTH_SECRET), {
    audience: session.session.id,
  }).then((res) => res.payload);
  return await consentAccept(code_challenge, user, scopes, audience);
}

export async function noConsent(code_challenge: string) {
  return await ory
    .rejectOAuth2ConsentRequest({
      consentChallenge: code_challenge,
      rejectOAuth2Request: {
        error: "access_denied",
        error_description: "User denied access",
      },
    })
    .then((res) => res.data.redirect_to);
}
