import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import fetchUser from "../../consent/fetch-user";

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

  const oauth2Session = await db.query.oauth2LoginSession.findFirst({
    columns: {
      client_id: true,
      user_id: true,
    },
    where(fields, operators) {
      return (
        operators.eq(fields.access_token, token) &&
        operators.isNotNull(fields.access_token) &&
        operators.isNotNull(fields.at_expires_at) &&
        operators.gt(fields.at_expires_at, new Date())
      );
    },
  });

  if (!oauth2Session) {
    return new NextResponse("Unauthorized - No Session", {
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
      discord_direct: client.with_discord_direct,
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
