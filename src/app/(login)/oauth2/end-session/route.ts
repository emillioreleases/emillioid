import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { oauth2LogoutSession } from "~/server/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  const client_id = req.nextUrl.searchParams.get("client_id");
  const post_logout_redirect_uri = req.nextUrl.searchParams.get(
    "post_logout_redirect_uri",
  );

  if (!client_id || !post_logout_redirect_uri) {
    return new Response("Bad request", { status: 400 });
  }

  const client = await db.query.oauth2Client.findFirst({
    columns: {
      postLogoutRedirectUris: true,
    },
    where(fields, operators) {
      return operators.eq(fields.id, client_id);
    },
  });

  if (!client) {
    return new Response("Bad request", { status: 400 });
  }

  if (!client.postLogoutRedirectUris.includes(post_logout_redirect_uri)) {
    return new Response("Bad request", { status: 400 });
  }

  if (!session?.user) {
    redirect(post_logout_redirect_uri);
  }

  const result = await db
    .insert(oauth2LogoutSession)
    .values({
      user_id: session.user.id,
      client_id: client_id,
      created_at: new Date(),
      updated_at: new Date(),
      post_logout_redirect_uri: post_logout_redirect_uri,
    })
    .returning();

  return redirect(`/signout?flow=${result[0]!.id}`);
}
