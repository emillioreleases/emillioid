import "server-only";
import { db } from "~/server/db";
import { OAuthError } from "./errors/OAuthError";
import { base64url, CompactEncrypt, importJWK, SignJWT } from "jose";
import { env } from "~/env";
import type { auth } from "~/server/auth";
import { OAuthResponseTypes, type OAuthScopes } from "./Enums";
import { oauth2LoginSession } from "~/server/db/schema";

const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);

export async function clientValidity(query: {
  client_id: string;
  state: string;
  redirect_uri: string;
}) {
  const client = await db.query.oauth2Client.findFirst({
    columns: {
      id: true,
      redirectUris: true,
    },
    where(fields, operators) {
      return operators.eq(fields.id, query.client_id);
    },
  });
  if (!client) {
    throw new OAuthError("invalid_client", "Client not found", query.state);
  }
  if (!client.redirectUris.includes(query.redirect_uri)) {
    throw new OAuthError(
      "invalid_request",
      "Invalid redirect_uri",
      query.state,
    );
  }
}

export async function approveOAuthRequest(
  query: {
    client_id: string;
    state: string;
    scope: OAuthScopes[];
    response_type: OAuthResponseTypes[];
    redirect_uri: string;
  },
  body: {
    selected_account?: string;
    social_account?: string;
    consent_granted?: boolean;
  },
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
) {
  const data: typeof oauth2LoginSession.$inferInsert = {
    id_token: null,
    access_token: null,
    refresh_token: null,
    authorization_code: null,
    code_verifier: null,
    session_id: session.session.id,
    user_id: session.user.id,
    client_id: query.client_id,
    scope: query.scope.join(" "),
    redirect_uri: query.redirect_uri,
    token_type: "Bearer",
    created_at: new Date(),
    updated_at: new Date(),
    force_roblox_account: body.selected_account === "roblox",
  };

  const uriEncodedStrings = new URLSearchParams();
  let followupData: typeof oauth2LoginSession.$inferSelect | undefined;

  for (const responseType of query.response_type) {
    switch (responseType) {
      case OAuthResponseTypes.Code:
        data.authorization_code = await generateToken(query, session, "ac");
        uriEncodedStrings.set("code", data.authorization_code);
      case OAuthResponseTypes.Token:
        data.access_token = await generateToken(query, session, "at");
        uriEncodedStrings.set("access_token", data.access_token);
        uriEncodedStrings.set("token_type", "Bearer");
      case OAuthResponseTypes.IDToken:
        if (!followupData) {
          followupData = (
            await db.insert(oauth2LoginSession).values(data).returning()
          )[0];
        }
        data.id_token = await generateIDToken(
          query,
          body,
          session,
          followupData?.id!,
        );
        uriEncodedStrings.set("id_token", data.id_token);
    }
  }

  await db.batch([db.insert(oauth2LoginSession).values(data).returning()]);
  return (
    query.redirect_uri +
    "?" +
    uriEncodedStrings.toString() +
    "&state=" +
    query.state
  );
}

async function generateIDToken(
  query: { client_id: string },
  body: { selected_account?: string },
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
  oauth2_session_id: string,
) {
  const idToken = await new SignJWT({
    sub:
      body.selected_account === "roblox"
        ? session.user.connectedRobloxAccount
        : session.user.id,
    sid: session.session.id,
    name: session.user.name,
    preferred_username: session.preferred_username,
    picture: userData.picture,
    email: userData.email,
    email_verified: true,
    groups: userData.groups,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://accounts.bloxvalschools.com")
    .setAudience(query.client_id)
    .setExpirationTime("1h")
    .sign(
      await importJWK(
        await db.query.oauth2Keys
          .findFirst({
            where(fields, operators) {
              return operators.eq(fields.alg, clientConfig.jwtSigningAlgorithm);
            },
          })
          .then((res) => res!.private_key),
        clientConfig.jwtSigningAl.gorithm,
      ),
    );
}

async function generateToken(
  query: { client_id: string },
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
  type: string,
) {
  return await new CompactEncrypt(
    new TextEncoder().encode(
      base64url.encode(
        crypto.randomUUID() +
          "|" +
          query.client_id +
          "|" +
          session.user.id +
          "|" +
          session.session.id +
          "|" +
          type,
      ),
    ),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .encrypt(encryptSecret);
}
