import { ory } from "./ory";

export async function consentAccept(
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
