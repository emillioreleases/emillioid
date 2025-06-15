import Image from "next/image";
import { auth } from "~/server/auth";
import { cookies, headers as headersStore } from "next/headers";
import SSOButtons from "./sso-buttons";
import RobloxLink from "./roblox-link";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { getOryLoginRequest } from "~/utils/get-login-request";
import SigningIn from "./signing-in";
import LoginTemplate from "./login-template";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ login_challenge: string | undefined }>;
}) {
  const cookieStore = await cookies();
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

  const canLogin = await api.login.canLogin(sp.login_challenge);

  let request;
  if (sp.login_challenge) {
    const prompt = await api.login.getPrompt(sp.login_challenge);
    const login_challenge = sp.login_challenge;
    try {
      request = await getOryLoginRequest(login_challenge ?? "");
    } catch (e: unknown) {
      const error = e as {
        response: { data: { error: string; error_description: string } };
      };
      return (
        <>
          <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
            <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
          </header>
          <div>
            Something went wrong!{" "}
            {error.response?.data
              ? error.response.data.error_description
              : "Unknown Error"}
          </div>
        </>
      );
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
            return (
              <RobloxLink
                clientName={request?.data.client.client_name ?? "My Apps"}
              />
            );
        }
      } else {
        return (
          <SigningIn
            login_challenge={login_challenge}
            prompt={prompt}
            promptBypass={cookieStore.has("bcps.auth.prompt-bypass")}
            clientName={request?.data.client.client_name ?? "My Apps"}
            sessions={[session, ...ms.filter((s) => s.session.id !== session.session.id).map((s) => s)]}
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
          return (
            <RobloxLink
              clientName={request?.data.client.client_name ?? "My Apps"}
            />
          );
      }
    } else {
    }
    redirect("/portal");
  }
  return (
    <LoginTemplate
      title={"Welcome!"}
      description={
        <>
          Please login to continue to{" "}
          <span className="font-bold">
            {request?.data.client.client_name ?? "My Apps"}
          </span>
        </>
      }
      partnerLogo={request?.data.client.logo_uri}
      havePtLinks
    >
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
        {request?.data.client.logo_uri && (
          <>
            <div className="h-auto w-[0.1px] border-[0.05px] border-white" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.data.client.logo_uri} alt={"Logo"} />
          </>
        )}
      </header>
      <main className="justify-left mb-12 flex w-full flex-col items-center space-y-4 sm:mb-5 sm:h-fit">
        <div className="flex w-full flex-col items-start justify-center">
          <h1 className="text-2xl font-bold text-white">Welcome!</h1>
          <h5 className="text-sm text-gray-400">
            Please login to continue to{" "}
            <span className="font-bold">
              {request?.data.client.client_name ?? "My Apps"}
            </span>
          </h5>
        </div>
        <SSOButtons />
        <div className="flex items-stretch justify-center space-x-2 text-sm text-gray-400">
          <a href="https://www.bloxvalschools.com/page/privacy-policy">
            Privacy Policy
          </a>
          <div className="w-[1px] border-[0.5px]" />
          <a href="https://www.bloxvalschools.com/page/tos">Terms of Use</a>
        </div>
      </main>
    </LoginTemplate>
  );
}
