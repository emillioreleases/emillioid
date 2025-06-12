import type { OAuth2ConsentRequest } from "@ory/client";
import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "~/server/db";

import { ory } from "~/utils/ory";
import Buttons from "./buttons";

export default async function Consent({
  searchParams,
}: {
  searchParams: Promise<{ consent_challenge: string }>;
}) {
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
        <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
          <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
        </header>
        <div>Something went wrong! {error.response?.data ? error.response.data.error_description: "Unknown Error"}</div>
      </>
    );
  }

  let user: {
    method: string;
    email: string;
    name: string;
    preferred_username: string;
    picture: string;
    groups: string[];
  };
  const context = consent.context as { login_method: string };

  console.log(context.login_method);
  console.log(consent);

  switch (context.login_method.toLowerCase()) {
    case "roblox":
      const [userFetch, avatarFetch] = await Promise.all([
        fetch(`https://users.roblox.com/v1/users/${consent.subject!}`),
        fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${consent.subject}&format=Png&size=720x720`,
        ),
      ]);
      const [userData1, avatar] = (await Promise.all([
        userFetch.json(),
        avatarFetch.json(),
      ])) as [
        { displayName: string; name: string; id: string; profileUrl: string },
        {
          data: {
            imageUrl: string;
          }[];
        },
      ];
      user = {
        method: context.login_method,
        email: `${userData1.id}@students.bloxvalschools.com`,
        name: `${userData1.displayName} (@${userData1.name})`,
        preferred_username: userData1.name,
        picture: avatar.data[0]!.imageUrl,
        groups: []
      };
      break;
    case "discord":
      if (
        (
          consent.client?.metadata as
            | { discord_direct: boolean | undefined }
            | undefined
        )?.discord_direct
      ) {
        const accountData = await db.query.account.findFirst({
          where(fields, operators) {
            return operators.eq(fields.accountId, consent.subject!);
          },
        });

        if (!accountData || accountData?.providerId !== "discord") {
          return (
            <div>
              Something went wrong while logging you in. Please restart from the
              beginning.
            </div>
          );
        }

        const userData = await db.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, accountData.userId);
          },
        });

        if (!userData) {
          return (
            <div>
              Something went wrong while logging you in. Please restart from the
              beginning.
            </div>
          );
        }

        user = {
          method: context.login_method,
          email: userData.email,
          name: userData.name,
          preferred_username: userData.email,
          picture: userData.image ?? "",
          groups: []
        };
      } else {
        const [userFetch, avatarFetch] = await Promise.all([
          fetch(`https://users.roblox.com/v1/users/${consent.subject!}`),
          fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${consent.subject}&format=Png&size=720x720`,
          ),
        ]);
        const [userData, avatar] = (await Promise.all([
          userFetch.json(),
          avatarFetch.json(),
        ])) as [
          { displayName: string; name: string; id: string; profileUrl: string },
          {
            data: {
              imageUrl: string;
            }[];
          },
        ];
        user = {
          method: context.login_method,
          email: `${userData.id}@students.bloxvalschools.com`,
          name: `${userData.displayName} (@${userData.name})`,
          preferred_username: userData.name,
          picture: avatar.data[0]!.imageUrl,
          groups: []
        };
      }
      break;
    case "myteam":
      if (
        (
          consent.client?.metadata as
            | { no_staff: boolean | undefined }
            | undefined
        )?.no_staff
      ) {
        return (
          <div>
            You cannot use your employee credentials to login to this site.
            Please log out and try again.
          </div>
        );
      }
      const userData = await db.query.user.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, consent.subject!);
        },
      });
      if (!userData) {
        return (
          <div>
            Something went wrong while logging you in. Please restart from the
            beginning.
          </div>
        );
      }

      user = {
        method: context.login_method,
        email: userData.email,
        name: userData.name,
        preferred_username: userData.email,
        picture: userData.image!,
        groups: JSON.parse(userData.groups) as string[],
      };

      break;
    default:
      return (
        <div>
          Something went wrong while logging you in. Please restart from the
          beginning.
        </div>
      );
  }

  async function giveConsent(code_challenge?: string) {
    return await ory
      .acceptOAuth2ConsentRequest({
        consentChallenge: code_challenge ?? (await searchParams).consent_challenge,
        acceptOAuth2ConsentRequest: {
          session: {
            id_token: {
              login_method: user.method,
              email: user.email,
              name: user.name,
              display_name: user.method === "roblox" || user.method === "discord" ? user.name.split(" ")[0] : user.name,
              preferred_username: user.preferred_username,
              picture: user.picture,
              groups: user.groups
            },
            access_token: {
              login_method: user.method,
              email: user.email,
              name: user.name,
              display_name: user.method === "roblox" || user.method === "discord" ? user.name.split(" ")[0] : user.name,
              preferred_username: user.preferred_username,
              picture: user.picture,
              groups: user.groups
            },
          },
          grant_scope: consent.requested_scope,
          grant_access_token_audience:
            consent.requested_access_token_audience,
        },
      })
      .then((res) => res.data.redirect_to);
  }

  redirect(await giveConsent());

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
        </ul>
      </div>
      <Buttons giveConsent={giveConsent} />
    </div>
  );
}
