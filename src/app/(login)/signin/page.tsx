import Image from "next/image";
import { auth } from "~/server/auth";
import { headers as headersStore } from "next/headers";
import SSOButtons from "./sso-buttons";
import RobloxLink from "./roblox-link";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import SigningIn from "./signing-in";
import LoginTemplate from "./login-template";
import { db } from "~/server/db";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ flow: string | undefined }>;
}) {
  const headers = await headersStore();
  const [session, ms] = await Promise.all([
    auth.api.getSession({
      headers,
    }),
    auth.api.listDeviceSessions({
      headers,
    }),
  ]);

  const sp = await searchParams;

  const canLogin = await api.login.canLogin(sp.flow);

  let client;
  let prompt;
  if (sp.flow) {
    const yes = await db.query.oauth2LoginAttempt.findFirst({
      columns: {
        promptBypass: true,
      },
      where(fields, operators) {
        return operators.eq(fields.id, sp.flow!);
      },
    });

    [client, prompt] = await Promise.all([
      api.oauth2.getClientDetails(sp.flow),
      api.oauth2.getStage(sp.flow),
    ]);

    if (!client || !prompt) {
      return (
        <>
          <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
            <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
          </header>
          <div>Something went wrong! Please contact the IT department.</div>
        </>
      );
    }

    const login_challenge = sp.flow;
    if (session?.user) {
      if (!canLogin.verdict && (!prompt || yes?.promptBypass)) {
        switch (canLogin.message) {
          case "NO_STAFF":
            return (
              <div>
                You cannot use your employee credentials to login to this site.
                Please log out and try again.
              </div>
            );
          case "NO_ROBLOX_ACCOUNT":
            return <RobloxLink clientName={client.name ?? "My Apps"} />;
        }
      } else {
        return (
          <SigningIn
            login_challenge={login_challenge}
            prompt={prompt}
            promptBypass={yes?.promptBypass}
            clientName={client.name ?? "My Apps"}
            sessions={[
              session,
              ...ms
                .filter((s) => s.session.id !== session.session.id)
                .map((s) => s),
            ]}
          />
        );
      }
    }
  }
  if (session?.user) {
    if (!canLogin.verdict) {
      switch (canLogin.message) {
        case "NO_STAFF":
          return (
            <div>
              You cannot use your employee credentials to login to this site.
              Please log out and try again.
            </div>
          );
        case "NO_ROBLOX_ACCOUNT":
          return <RobloxLink clientName={client?.name ?? "My Apps"} />;
      }
    } else {
    }
    redirect("/portal");
  }
  if (prompt) {
    switch (prompt) {
      case "login":
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={
              <>
                Please login to continue to{" "}
                <span className="font-bold">{client?.name ?? "My Apps"}</span>
              </>
            }
            havePtLinks
          >
            <SSOButtons withBypassRedirect />
          </LoginTemplate>
        );
    }
  }
  return (
    <LoginTemplate
      title={"Welcome!"}
      description={
        <>
          Please login to continue to{" "}
          <span className="font-bold">{client?.name ?? "My Apps"}</span>
        </>
      }
      havePtLinks
    >
      <SSOButtons />
    </LoginTemplate>
  );
};