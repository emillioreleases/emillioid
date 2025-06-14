import { cache } from "react";
import { ory } from "~/utils/ory";

export const getOryLoginRequest = cache(async (loginChallenge: string) => {
  return await ory.getOAuth2LoginRequest({
    loginChallenge: loginChallenge,
  });
});