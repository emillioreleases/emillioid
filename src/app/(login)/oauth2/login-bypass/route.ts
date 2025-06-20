import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { oauth2LoginAttempt } from "~/server/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const flowID = req.nextUrl.searchParams.get("flow");

  if (!flowID) {
    return NextResponse.json({
      message: "bad request",
      data: null,
    }, { status: 400 });
  }

  if (!session?.session) {
    redirect(`/signin?flow=${flowID}`);
  }

  await db.update(oauth2LoginAttempt).set({
    promptBypass: true,
  }).where(eq(oauth2LoginAttempt.id, flowID));

  return redirect(`/signin?flow=${flowID}`);
}