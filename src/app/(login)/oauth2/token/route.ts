import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import fetchUser from "../../consent/fetch-user";
import { z } from "zod";
import {
  base64url,
  compactDecrypt,
  CompactEncrypt,
  importJWK,
  jwtVerify,
  SignJWT,
} from "jose";
import { env } from "~/env";
import ms from "ms";
import { oauth2LoginSession } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { jwtZ } from "~/utils/jwtZ";

export async function POST(req: NextRequest) {
  const fdata = await req.formData();
  const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);
  const signSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_SIGN_KEY);
  const grantType = z
    .enum(["authorization_code", "refresh_token"])
    .safeParse(fdata.get("grant_type")!);
  const code = z.string().safeParse(fdata.get("code")!);
  const refresh_token = z.string().safeParse(fdata.get("refresh_token")!);
  const scope = z.string().safeParse(fdata.get("scope")!);
  const redirectUri = z.string().safeParse(fdata.get("redirect_uri")!);
  const clientId = z.string().safeParse(fdata.get("client_id")!);
  const clientSecret = z.string().safeParse(fdata.get("client_secret")!);
  const errors = [];

  if (grantType.error) {
    errors.push("grantType is invalid");
  }
  if (
    grantType.data === "authorization_code" &&
    (!code.success || !redirectUri.success)
  ) {
    errors.push("Missing code");
  }
  if (
    grantType.data === "refresh_token" &&
    (!refresh_token.success || !scope.success)
  ) {
    errors.push("Missing refresh token or scope");
  }
  if (clientId.error) {
    errors.push("clientID is invalid");
  }
  if (clientSecret.error) {
    errors.push("clientSecret is invalid");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "invalid_request",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const stuff = base64url.decode(
    grantType.data === "authorization_code" ? code.data! : refresh_token.data!,
  );
  let jwt;
  try {
    const decryptedJWT = await compactDecrypt(stuff, encryptSecret);
    jwt = await jwtVerify(
      new TextDecoder().decode(decryptedJWT.plaintext),
      signSecret,
      {
        audience: clientId.data,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const jwtData = jwtZ.safeParse(jwt.payload);

  if (!jwtData.success) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (
    grantType.data == "authorization_code" &&
    jwtData.data.tt !== "authorization_code"
  ) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (
    grantType.data == "refresh_token" &&
    jwtData.data.tt !== "refresh_token"
  ) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (
    jwtData.data.ruri !== redirectUri.data &&
    grantType.data === "authorization_code"
  ) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  /*   if (jwtData.data.scope !== scope.data && grantType.data === "refresh_token") {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } */

  const oauth2Session = await db.query.oauth2LoginSession.findFirst({
    columns: {
      id: true,
      session_id: true,
      client_id: true,
      user_id: true,
    },
    where(fields, operators) {
      return jwtData.data.tt === "authorization_code"
        ? operators.and(
            operators.eq(fields.authorization_code, jwtData.data.tid),
            operators.isNotNull(fields.authorization_code),
            operators.eq(fields.client_id, jwtData.data.aud),
          )
        : operators.and(
            operators.eq(fields.refresh_token, jwtData.data.tid),
            operators.isNotNull(fields.refresh_token),
            operators.eq(fields.client_id, jwtData.data.aud),
          );
    },
  });

  if (!oauth2Session) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const [account, clientConfig] = await db.batch([
    db.query.account.findFirst({
      columns: {
        providerId: true,
      },
      where(fields, operators) {
        return operators.eq(fields.userId, oauth2Session.user_id);
      },
    }),
    db.query.oauth2Client.findFirst({
      columns: {
        id: true,
        clientSecret: true,
        with_discord_direct: true,
        with_no_staff: true,
      },
      where(fields, operators) {
        return operators.eq(fields.id, oauth2Session.client_id);
      },
    }),
  ]);

  if (!account || !clientConfig) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (clientConfig.clientSecret !== clientSecret.data) {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const userData = await fetchUser(oauth2Session.user_id, account.providerId, {
    discord_direct: clientConfig.with_discord_direct,
    no_staff: clientConfig.with_no_staff,
  });
  if (typeof userData === "string") {
    return NextResponse.json(
      {
        error: "invalid_grant",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const idToken = await new SignJWT({
    sub: userData.subject,
    sid: oauth2Session.session_id,
    name: userData.name,
    preferred_username: userData.preferred_username,
    picture: userData.picture,
    email: userData.email,
    email_verified: true,
    groups: userData.groups,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("https://accounts.bloxvalschools.com")
    .setAudience(clientConfig.id)
    .setExpirationTime("1h")
    .sign(
      await importJWK(
        await db.query.oauth2Keys
          .findFirst({
            where(fields, operators) {
              return operators.eq(fields.alg, "RS256");
            },
          })
          .then((res) => res!.private_key),
        "RS256",
      ),
    );

  const attid = crypto.randomUUID();
  const rttid = crypto.randomUUID();

  const accessTokenSigned = await new SignJWT({
    sub: userData.subject,
    tt: "access_token",
    tid: attid,
    sid: oauth2Session.session_id,
    sid2: oauth2Session.id,
  })
    .setIssuedAt()
    .setAudience(clientConfig.id)
    .setExpirationTime("5 minutes")
    .setProtectedHeader({ alg: "HS512", typ: "JWT" })
    .sign(signSecret);

  const refreshTokenSigned = await new SignJWT({
    sub: userData.subject,
    tt: "refresh_token",
    tid: rttid,
    sid: oauth2Session.session_id,
    sid2: oauth2Session.id,
  })
    .setIssuedAt()
    .setAudience(clientConfig.id)
    .setExpirationTime("30d")
    .setProtectedHeader({ alg: "HS512", typ: "JWT" })
    .sign(signSecret);

  const accessToken = await new CompactEncrypt(
    new TextEncoder().encode(accessTokenSigned),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .encrypt(encryptSecret);

  const refreshToken = await new CompactEncrypt(
    new TextEncoder().encode(refreshTokenSigned),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .encrypt(encryptSecret);

  await db
    .update(oauth2LoginSession)
    .set({
      access_token: attid,
      refresh_token: rttid,
      id_token: idToken,
      authorization_code: null,
    })
    .where(eq(oauth2LoginSession.id, oauth2Session.id));

  return NextResponse.json(
    {
      access_token: base64url.encode(new TextEncoder().encode(accessToken)),
      token_type: "Bearer",
      refresh_token: base64url.encode(new TextEncoder().encode(refreshToken)),
      expires_in: ms("5 minutes") / 1000,
      id_token: idToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
