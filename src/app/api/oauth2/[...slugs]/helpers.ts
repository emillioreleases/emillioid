import "server-only";
import { db } from "~/server/db";
import { OAuthError } from "./errors/OAuthError";
import { base64url, compactDecrypt, CompactEncrypt, importJWK, SignJWT } from "jose";
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
    id: crypto.randomUUID(),
    has_authorization_code_been_used: query.response_type.includes(OAuthResponseTypes.Code) ? false : true,
    code_verifier: null,
    session_id: session.id,
    user_id: session.userId,
    client_id: query.client_id,
    scope: query.scope.join(" "),
    redirect_uri: query.redirect_uri,
    token_type: "Bearer",
    created_at: new Date(),
    updated_at: new Date(),
    social_user_id: flow.selected_account!
  };

  const uriEncodedStrings = new URLSearchParams();

  for (const responseType of query.response_type) {
    console.log("responseType", responseType);
    switch (responseType) {
      case OAuthResponseTypes.Code:
        const ac = await generateToken(crypto.randomUUID(), data.id!, "ac");
        uriEncodedStrings.set("code", ac);
        break;
      case OAuthResponseTypes.Token:
        const at = await generateToken(crypto.randomUUID(), data.id!, "at");
        uriEncodedStrings.set("access_token", at);
        uriEncodedStrings.set("token_type", "Bearer");
        break;
      case OAuthResponseTypes.IDToken:
        const idt = await generateIDToken(client, userData, session);
        uriEncodedStrings.set("id_token", idt);
        break;
      default:
        throw new OAuthError(
          "unsupported_response_type",
          "Response type is not supported.",
          query.state,
        );
    }
  }

  await db.insert(oauth2LoginSession).values(data);
  return (
    query.redirect_uri +
    "?" +
    uriEncodedStrings.toString() +
    "&state=" +
    query.state
  );
}

export async function generateIDToken(
  client: { id: string; jwtSigningAlgorithm: string },
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
    .setProtectedHeader({ alg: client.jwtSigningAlgorithm, typ: "JWT" })
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

export async function getTokenData(token: string) {
  try {
    const decryptedToken = await compactDecrypt(token, encryptSecret);
    const tokenString = new TextDecoder().decode(decryptedToken.plaintext);
    const [token_id, type, session_id, iat, exp] = tokenString.split("|") as [string, string, string, string, string];
    return { token_id, type, session_id, iat, exp };
  } catch {
    return null;
  }
}

export async function generateToken(
  token_id: string,
  oauth2SessionID: string,
  type: string,
  expirationOverride?: number,
) {
  let exp: number;
  switch (type) {
    case "ac":
      exp = Date.now() + 1000 * 60 * 1;
      break;
    case "at":
      exp = Date.now() + 1000 * 60 * 5;
      break;
    case "rt":
      exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
      break;
    default:
      throw new Error("Invalid token type");
  }

  if (expirationOverride) {
    exp = expirationOverride;
  }

  return await new CompactEncrypt(
    new TextEncoder().encode(
      token_id + "|" + type + "|" + oauth2SessionID + "|" + Date.now() + "|" + exp,
    ),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .encrypt(encryptSecret);
}
