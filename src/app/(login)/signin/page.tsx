import { cookies } from "next/headers";
import SSOButtons from "./sso-buttons";
import LoginTemplate from "./login-template";
import { db } from "~/server/db";
import { InvalidFlow } from "~/app/_components/invalid-flow";
import RobloxLink from "./prompts/roblox-link";
import { jwtVerify } from "jose";
import { env } from "~/env";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ flow: string | undefined }>;
}) {
  const [cookieStore, { flow }] = await Promise.all([cookies(), searchParams]);

  if (!flow || !cookieStore.has("emillioid.flow") || cookieStore.get("emillioid.flow")?.value !== flow) {
    return <InvalidFlow />;
  }

  if (!cookieStore.has("emillioid.flow-attestation")) {
    return <InvalidFlow />;
  }

  const verifyToken = await jwtVerify(
    cookieStore.get("emillioid.flow-attestation")!.value,
    new TextEncoder().encode(env.BETTER_AUTH_SECRET),
    {
      issuer: env.BETTER_AUTH_URL,
    }
  ).catch(() => null);

  if (!verifyToken || !verifyToken.payload || verifyToken.payload.flow !== flow) {
    return <InvalidFlow />;
  }

  const flowData = await db.query.flowPopup.findFirst({
    columns: {
      status: true,
    },
    where(fields, operators) {
      return operators.eq(fields.id, flow);
    },
    with: {
      client: true,
      session: {
        columns: {
          token: true,
        },
      }
    },
  });

  if (!flowData) {
    return <InvalidFlow />;
  }

  if (cookieStore.get("emillioid.session")?.value !== flowData.session?.token) {
    return <InvalidFlow />;
  }

  switch (flowData.status) {
    case "forced_login":
      return (
        <LoginTemplate title="Sign in" description={`Please sign in to continue to ${flowData?.client?.name || "your applications."}.`}>
          <SSOButtons />
        </LoginTemplate>
      );
    case "select_account":
      return <LoginTemplate title="Select an account" description={`Please select an account to continue to ${flowData?.client?.name || "your applications."}.`} />
      ;
    case "link_account":
      return <LoginTemplate title="Link an account" description={`Please link an account to continue to ${flowData?.client?.name || "your applications."}.`}>
        <RobloxLink clientName={flowData?.client?.name!} challenge={flow} />
      </LoginTemplate>
      ;
    case "consent_needed":
      return <LoginTemplate title="Consent needed" description={`Please provide consent to continue to ${flowData?.client?.name || "your applications."}.`} />
      ;
    case "complete":
      return <LoginTemplate title="Complete" description={`You have completed the flow for ${flowData?.client?.name || "your applications."}.`} />
      ;
  }
}
