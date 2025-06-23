import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import fetchUser from "../../consent/fetch-user";
import { jwtZ } from "~/utils/jwtZ";
import { base64url, compactDecrypt, jwtVerify } from "jose";
import { env } from "~/env";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer") {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  if (!token) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  const base64urlData = base64url.decode(token);
  let jwt;
  try {
    const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);
    const signSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_SIGN_KEY);
    const decryptedJWT = await compactDecrypt(base64urlData, encryptSecret);
    jwt = await jwtVerify(decryptedJWT.plaintext, signSecret);
  } catch {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  const jwtData = jwtZ.safeParse(jwt.payload);

  if (!jwtData.success) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  if (jwtData.data.tt !== "access_token") {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  const oauth2Session = await db.query.oauth2LoginSession.findFirst({
    columns: {
      client_id: true,
      user_id: true,
      force_roblox_account: true
    },
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.access_token, jwtData.data?.tid),
        operators.isNotNull(fields.access_token),
        operators.eq(fields.client_id, jwtData.data.aud)
      );
    },
  });

  if (!oauth2Session) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  const [user, client, account] = await db.batch([
    db.query.user.findFirst({
      columns: {
        id: true,
      },
      where(fields, operators) {
        return operators.eq(fields.id, oauth2Session.user_id);
      },
    }),
    db.query.oauth2Client.findFirst({
      columns: {
        with_discord_direct: true,
        with_no_staff: true,
      },
      where(fields, operators) {
        return operators.eq(fields.id, oauth2Session.client_id);
      },
    }),
    db.query.account.findFirst({
      columns: {
        providerId: true,
        accountId: true,
      },
      where(fields, operators) {
        return operators.eq(fields.userId, oauth2Session.user_id);
      },
    }),
  ]);

  if (!user || !client || !account) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }
  const userData = await fetchUser(
    account.providerId === "microsoft" ? user.id : account.accountId,
    account.providerId,
    {
      discord_direct: oauth2Session.force_roblox_account ? false : client.with_discord_direct,
      no_staff: client.with_no_staff,
    },
  );

  if (typeof userData === "string") {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
      },
    });
  }

  return NextResponse.json({
    sub: userData.subject,
    name: userData.name,
    given_name: userData.name.split(" ")[0],
    family_name: userData.name.split(" ")[1],
    preferred_username: userData.preferred_username,
    picture: userData.picture,
    email: userData.email,
    email_verified: true,
    groups: userData.groups,
  }, {
    headers: {
      "Content-Type": "application/json",
    }
  });
}
