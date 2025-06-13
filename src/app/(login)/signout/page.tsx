import Image from "next/image";
import { ory } from "~/utils/ory";
import ActionButtons from "./action-buttons";
import { headers } from "next/headers";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function SignOut({ searchParams }: { searchParams: Promise<{ logout_challenge: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const logoutChallenge = (await searchParams).logout_challenge;
  let request;
  if (logoutChallenge) {
    try {
      request = await ory.getOAuth2LogoutRequest({
        logoutChallenge: logoutChallenge ?? "",
      }).then((res) => res.data);
    } catch (e: unknown) {
      const error = e as {
        response: { data: { error: string; error_description: string } };
      };
      return (
        <>
          <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
            <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
          </header>
          <div>Something went wrong! {error.response?.data ? error.response.data.error_description: "Unknown Error"}</div>
        </>
      );
    }
    if (!session?.session) {
      await ory.acceptOAuth2LogoutRequest({
        logoutChallenge: logoutChallenge ?? "",
      }).then((res) => redirect(res.data.redirect_to));
    }
  }

  if (!session?.session) {
    redirect("/portal");
  }

  return (
    <>
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
        {request?.client?.logo_uri && (
          <>
            <div className="h-auto w-[0.1px] border-[0.05px] border-white" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.client.logo_uri} alt={"Logo"} />
          </>
        )}
      </header>
      <main className="justify-left mb-12 flex w-full flex-col items-center space-y-4 sm:mb-5 sm:h-fit">
        <div className="flex w-full flex-col items-start justify-center">
          <h1 className="text-2xl font-bold text-white">Would you like to logout globally?</h1>
          <h5 className="text-sm text-gray-400">
            {"You are already logged out of "}
            <span className="font-bold">
              {request?.client?.client_name ?? "My Apps"}
            </span>{", would you like to logout globally?"}
          </h5>
        </div>
        <ActionButtons redirectUrl={"/portal"} logoutChallenge={logoutChallenge ?? null} />
      </main>
    </>
  );
}
