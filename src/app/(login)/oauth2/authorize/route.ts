import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { oauth2LoginAttempt } from "~/server/db/schema";

export async function GET(req: NextRequest) {
  const [client, session] = await Promise.all([
    db.query.oauth2Client.findFirst({
      columns: {
        id: true,
        redirectUris: true,
      },
      where(fields, operators) {
        return operators.eq(
          fields.id,
          req.nextUrl.searchParams.get("client_id")!,
        );
      },
    }),
    auth.api.getSession({
      headers: req.headers,
    }),
  ]);

  if (!client) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "No client",
      },
      {
        status: 400,
      },
    );
  }

  const oauth2LoginAttemptObj: {
    id: string;
    client_id: string;
    login_hint: string | null;
    redirect_uri: string;
    response_type: string;
    scope: string;
    state: string | null;
    nonce: string | null;
    user_id: string | null;
    created_at: Date;
    updated_at: Date;
  } = {
    id: crypto.randomUUID(),
    client_id: client.id,
    login_hint: req.nextUrl.searchParams.get("login_hint"),
    redirect_uri: req.nextUrl.searchParams.get("redirect_uri")!,
    response_type: req.nextUrl.searchParams.get("response_type")!,
    scope: req.nextUrl.searchParams.get("scope")!,
    state: req.nextUrl.searchParams.get("state"),
    nonce: req.nextUrl.searchParams.get("nonce"),
    created_at: new Date(),
    updated_at: new Date(),
    user_id: null,
  };

  if (!client.redirectUris.includes(oauth2LoginAttemptObj.redirect_uri)) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Invalid redirect_uri",
      },
      {
        status: 400,
      },
    );
  }

  if (session?.session) {
    oauth2LoginAttemptObj.user_id = session.session.userId;
  }

  await db.insert(oauth2LoginAttempt).values(oauth2LoginAttemptObj);
  redirect(`/signin?flow=${oauth2LoginAttemptObj.id}`);
}
