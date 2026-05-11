import "server-only";
import { db } from "~/server/db";
import { OAuthError } from "./errors/OAuthError";
import { base64url, CompactEncrypt, importJWK, SignJWT } from "jose";
import { env } from "~/env";
import { OAuthResponseTypes, type OAuthScopes } from "./Enums";
import {
  flowPopup,
  oauth2LoginSession,
  oauth2Client,
  session as sessionDb,
  socialUsers,
} from "~/server/db/schema";

const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);

export async function clientValidity(query: {
  client_id: string;
  state: string;
  redirect_uri: string;
}) {
  const client = await db.query.oauth2Client.findFirst({
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
  return client;
}

export async function approveOAuthRequest(
  query: {
    client_id: string;
    state: string;
    scope: OAuthScopes[];
    response_type: OAuthResponseTypes[];
    redirect_uri: string;
  },
  client: typeof oauth2Client.$inferSelect,
  flow: typeof flowPopup.$inferSelect,
  session: typeof sessionDb.$inferSelect,
) {
  const userData = await db.query.socialUsers.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, flow.selected_account!);
    },
  });

  if (!userData) {
    throw new Error("Found no user data");
  }
  const data: typeof oauth2LoginSession.$inferInsert = {
    id_token: null,
    access_token: null,
    refresh_token: null,
    authorization_code: null,
    code_verifier: null,
    session_id: session.id,
    user_id: session.userId,
    client_id: query.client_id,
    scope: query.scope.join(" "),
    redirect_uri: query.redirect_uri,
    token_type: "Bearer",
    created_at: new Date(),
    updated_at: new Date(),
    force_roblox_account: userData.accountType === "roblox",
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
        data.id_token = await generateIDToken(client, userData, session);
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
  client: typeof oauth2Client.$inferSelect,
  selected_account: typeof socialUsers.$inferSelect,
  session: typeof sessionDb.$inferSelect,
) {
  const idToken = await new SignJWT({
    sub: selected_account.accountType + "|" + selected_account.accountId,
    sid: session.id,
    name: `${selected_account.display_name} (@${selected_account.username})`,
    nickname: selected_account.display_name,
    preferred_username: selected_account.username,
    picture: selected_account.image,
    email: `${selected_account.accountId}@${selected_account.accountType}.accounts.emillio.dev`,
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://accounts.emillio.dev")
    .setAudience(client.id)
    .setExpirationTime("1h")
    .sign(
      await importJWK(
        await db.query.oauth2Keys
          .findFirst({
            where(fields, operators) {
              return operators.eq(fields.alg, client.jwtSigningAlgorithm);
            },
          })
          .then((res) => res!.private_key),
        client.jwtSigningAlgorithm,
      ),
    );
  return idToken;
}

async function generateToken(
  query: { client_id: string },
  session: typeof sessionDb.$inferSelect,
  type: string,
) {
  return await new CompactEncrypt(
    new TextEncoder().encode(
      base64url.encode(
        crypto.randomUUID() +
          "|" +
          query.client_id +
          "|" +
          session.userId +
          "|" +
          session.id +
          "|" +
          type,
      ),
    ),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .encrypt(encryptSecret);
}
