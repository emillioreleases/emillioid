import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import fetchUser from "../../consent/fetch-user";
import { z } from "zod";
import { base64url, importJWK, SignJWT } from "jose";
import { env } from "~/env";
import ms from "ms";
import { oauth2LoginSession } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const fdata = await req.formData();
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
  if (grantType.data === "authorization_code" && !code.success) {
    errors.push("Missing code");
  }
  if (grantType.data === "refresh_token" && (!refresh_token.success || !scope.success)) {
    errors.push("Missing refresh token or scope");
  }
  if (redirectUri.error) {
    errors.push("redirectURI is invalid");
  }
  if (clientId.error) {
    errors.push("clientID is invalid");
  }
  if (clientSecret.error) {
    errors.push("clientSecret is invalid");
  }

  if (errors.length > 0) {
    console.log(errors);
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

  let oauth2Session;
  if (grantType.data === "authorization_code") {
    oauth2Session = await db.query.oauth2LoginSession.findFirst({
      columns: {
        id: true,
        session_id: true,
        client_id: true,
        user_id: true,
      },
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.authorization_code, code.data!),
          operators.isNotNull(fields.authorization_code),
          operators.isNotNull(fields.ac_expires_at),
          operators.gt(fields.ac_expires_at, new Date()),
          operators.eq(fields.redirect_uri, redirectUri.data!),
        );
      },
    });
  } else {
    oauth2Session = await db.query.oauth2LoginSession.findFirst({
      columns: {
        id: true,
        session_id: true,
        client_id: true,
        user_id: true,
      },
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.refresh_token, refresh_token.data!),
          operators.isNotNull(fields.refresh_token),
          operators.isNotNull(fields.rt_expires_at),
          operators.gt(fields.rt_expires_at, new Date()),
          operators.eq(fields.scope, scope.data!),
        );
      },
    });
  }

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

  const userData = await fetchUser(oauth2Session.user_id, account.providerId, {
    discord_direct: clientConfig.with_discord_direct,
    no_staff: clientConfig.with_no_staff,
  });
  if (typeof userData === "string") {
    console.log(userData);
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
    given_name: userData.name.split(" ")[0],
    family_name: userData.name.split(" ")[1],
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

  const accessToken = await new SignJWT({
    sub: userData.subject,
    token_type: "access_token",
    sid: oauth2Session.session_id,
  })
    .setAudience(clientConfig.id)
    .setExpirationTime("5 minutes")
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new TextEncoder().encode(env.BETTER_AUTH_SECRET));

  const refreshToken = await new SignJWT({
    sub: userData.subject,
    token_type: "refresh_token",
    sid: oauth2Session.session_id,
  })
    .setAudience(clientConfig.id)
    .setExpirationTime("30d")
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new TextEncoder().encode(env.BETTER_AUTH_SECRET));

  await db
    .update(oauth2LoginSession)
    .set({
      access_token: base64url.encode(new TextEncoder().encode(accessToken)),
      refresh_token: base64url.encode(new TextEncoder().encode(refreshToken)),
      at_expires_at: new Date(new Date().getTime() + ms("5 minutes")),
      rt_expires_at: new Date(new Date().getTime() + ms("30d")),
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
