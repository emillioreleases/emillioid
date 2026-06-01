import Image from "next/image";
import { auth } from "~/server/auth";
import { cookies as cookiesStore } from "next/headers";
import SSOButtons from "./sso-buttons";
import RobloxLink from "./prompts/roblox-link";
import { redirect } from "next/navigation";
import SigningIn from "./signing-in";
import LoginTemplate from "./login-template";
import { db } from "~/server/db";
import { InvalidFlow } from "~/app/_components/invalid-flow";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ rurl: string | undefined }>;
}) {
  const cookies = await cookiesStore();
  const activeSession = cookies.get("emillioid.active-session")?.value || null;

  const { rurl } = await searchParams;
  if (!rurl) {
    return <InvalidFlow />;
  }

  if (activeSession) {
    await db.query.session.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, "");
      },
    });
  }
}
