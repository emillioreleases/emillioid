import { ory } from "~/utils/ory";
import Image from "next/image";
import { auth } from "~/server/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import SSOButtons from "./sso-buttons";
import RobloxLink from "./roblox-link";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ login_challenge: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { login_challenge } = await searchParams;
  let request;
  if (login_challenge) {
    try {
      request = await ory.getOAuth2LoginRequest({
        loginChallenge: login_challenge ?? "",
      });
    } catch (e: unknown) {
      const error = e as {
        response: { data: { error: string; error_description: string } };
      };
      console.log(error.response.data.error_description);
      return (
        <>
          <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
            <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
          </header>
          <div>
            Something went wrong! {error.response.data.error_description}
          </div>
        </>
      );
    }

    async function permitLogin(subject: string, loginMethod: string) {
      await ory
        .acceptOAuth2LoginRequest({
          loginChallenge: login_challenge ?? "",
          acceptOAuth2LoginRequest: {
            subject,
            context: {
              login_method: loginMethod,
            },
          },
        })
        .then((res) => redirect(res.data.redirect_to));
    }

    if (session?.user) {
      if (session.user.email.endsWith("@bloxvalschools.com")) {
        if (
          request.data.client.metadata &&
          !(request.data.client.metadata as { no_staff: boolean | undefined })
            .no_staff
        ) {
          await permitLogin(session.user.id, "myteam");
        } else {
          return (
            <div>
              You cannot use your employee credentials to login to this site.
              Please log out and try again.
            </div>
          );
        }
      } else {
        let method = "";
        const account = await db.query.account.findFirst({
          where(fields, operators) {
            return operators.eq(fields.userId, session.user.id);
          },
        });

        if (session.user.email.endsWith("@students.bloxvalschools.com")) {
          if (!session.user.connectedRobloxAccount) {
            await db
              .update(user)
              .set({
                connectedRobloxAccount: session.user.email.split("@")[0],
                verifiedWanted: true,
              })
              .where(eq(user.id, session.user.id));
          }
          method = "roblox";
        } else {
          method = "discord";
        }

        if (
          !(
            request.data.client.metadata as
              | { discord_direct: boolean | undefined }
              | undefined
          )?.discord_direct &&
          !session.user.connectedRobloxAccount
        ) {
          return (
            <RobloxLink clientName={request?.data.client.client_name ?? "My Apps"} />
          );
        }

        console.log(session.user.connectedRobloxAccount);

        await permitLogin(
          session.user.connectedRobloxAccount ?? account!.accountId,
          method,
        );
      }
    }
  }
  if (session?.user) {
    if (!session.user.email.endsWith("bloxvalschools.com") && !session.user.connectedRobloxAccount) {
      return <RobloxLink clientName={request?.data.client.client_name ?? "My Apps"} />;
    }
    redirect("/portal");
  }
  return (
    <>
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
            <span className="font-bold">{request?.data.client.client_name ?? "My Apps"}</span>
          </h5>
        </div>
        <SSOButtons />
        <div className="flex items-stretch justify-center space-x-2 text-sm text-gray-400">
          <a href="https://www.bloxvalschools.com/page/privacy-policy">Privacy Policy</a>
          <div className="w-[1px] border-[0.5px]" />
          <a href="https://www.bloxvalschools.com/page/tos">Terms of Use</a>
        </div>
      </main>
    </>
  );
}
