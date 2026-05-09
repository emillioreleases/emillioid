export enum OAuthResponseTypes {
  Code = "code",
  IDToken = "id_token",
  Token = "token",
}

export enum OAuthPromptTypes {
  None = "none",
  Login = "login",
  Consent = "consent",
  SelectAccount = "select_account",
}

export enum OAuthScopes {
  OpenID = "openid",
  Profile = "profile",
  Email = "email",
}

export type OAuthScopesValue = `${OAuthScopes}`;
