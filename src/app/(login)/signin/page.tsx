import Image from "next/image";
import { auth } from "~/server/auth";
import { cookies } from "next/headers";
import SSOButtons from "./sso-buttons";
import RobloxLink from "./prompts/roblox-link";
import { redirect } from "next/navigation";
import SigningIn from "./signing-in";
import LoginTemplate from "./login-template";
import { db } from "~/server/db";
import { InvalidFlow } from "~/app/_components/invalid-flow";
import { OAuthPromptTypes } from "~/app/api/oauth2/[...slugs]/Enums";
import { CalculateNextStage } from "~/utils/calculate-next-stage";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ flow: string | undefined }>;
}) {
  const [cookieStore, { flow }] = await Promise.all([cookies(), searchParams]);
  const session = cookieStore.get("emillioid.session")?.value || null;
  const flowToken = cookieStore.get("emillioid.flow")?.value;

  if (flow) {
    cookieStore.set("emillioid.flow", flow, {
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 30,
      path: "/",
      sameSite: "strict",
    });
  }

  if (!flow && !flowToken) {
    return <InvalidFlow />;
  }

  const flowData = await db.query.flowPopup.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, flow || flowToken!);
    },
    with: {
      client: true,
    },
  });

  const prompt = CalculateNextStage(flowData!, flowData!.client!);

  cookieStore.set("emillioid.return-url", "/signin?flow=" + flowData!.id, {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
  });

  switch (prompt) {
    case "forced_login":
    case "select_account":
  }
}
