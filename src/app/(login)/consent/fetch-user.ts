import { db } from "~/server/db";
import { ory } from "~/utils/ory";

export default async function fetchUser(challenge: string): Promise<string | { method: string; email: string; name: string; preferred_username: string; picture: string; groups: string[]; }> {
  const consent = await ory.getOAuth2ConsentRequest({
    consentChallenge: challenge,
  }).then((res) => res.data);
  if (!consent) {
    return "UNKNOWN_ERROR";
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
          return "UNKNOWN_ERROR";
        }

        const userData = await db.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, accountData.userId);
          },
        });

        if (!userData) {
          return "UNKNOWN_ERROR";
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
        return "NO_STAFF";
      }
      const userData = await db.query.user.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, consent.subject!);
        },
      });
      if (!userData) {
        return "UNKNOWN_ERROR";
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
      return "UNKNOWN_ERROR";
    }
    return user;
}