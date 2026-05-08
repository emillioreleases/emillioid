export enum OAuthResponseTypes {
  Code = "code",
  Token = "token",
}

export enum OAuthPromptTypes {
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
