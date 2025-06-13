import type { OAuth2ConsentRequest } from "@ory/client";
import { redirect } from "next/navigation";

import { ory } from "~/utils/ory";
import Buttons from "./buttons";
import { auth } from "~/server/auth";
import { headers } from "next/headers";
import { api } from "~/trpc/server";
import { type TRPCError } from "@trpc/server";

export default async function Consent({
  searchParams,
}: {
  searchParams: Promise<{ consent_challenge: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  let consent: OAuth2ConsentRequest;
  try {
    consent = await ory.getOAuth2ConsentRequest({
      consentChallenge: (await searchParams).consent_challenge,
    }).then((res) => res.data);
  } catch (e: unknown) {
    const error = e as {
      response: { data: { error: string; error_description: string } };
    };
    return (
      <>
        <div>Something went wrong! {error.response?.data ? error.response.data.error_description: "Unknown Error"}</div>
      </>
    );
  }

  if (!session?.session) {
    redirect(
      await ory.rejectOAuth2ConsentRequest({
        consentChallenge: consent.challenge,
        rejectOAuth2Request: {
          error: "access_denied",
          error_description: "No session",
        },
      }).then((res) => res.data.redirect_to),
    )
  }

  const context = consent.context as { login_method: string };

  console.log(context.login_method);
  console.log(consent);

  if (consent.skip || consent.client?.skip_consent) {
    try {
      redirect(await api.consent.giveConsent(consent.challenge))
    } catch (e) {
      const error = e as TRPCError;
      return (
        <div>
          Something went wrong! {error.message}
        </div>
      )
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 sm:h-fit">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-white">
          We need your permission to continue.
        </h1>
        <h5 className="text-sm text-gray-400">
          Do you consent to logging in to {consent.client?.client_name} with your myBCPS account?
        </h5>
      </div>
      <div className="flex w-full flex-col items-center justify-center space-y-2">
        <h6 className="text-sm text-gray-400">Permissions Gained</h6>
        <ul className="flex w-full flex-col items-start justify-center space-y-2 text-sm text-gray-400">
          <li>- View your account information</li>
          <li>- View your account groups</li>
          <li>- View your myBCPS email.</li>
        </ul>
      </div>
      <Buttons challenge={consent.challenge}  />
    </div>
  );
}
