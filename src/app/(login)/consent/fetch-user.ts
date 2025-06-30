import { db } from "~/server/db";

export default async function fetchUser(
  userId: string,
  login_method: string,
  config: { discord_direct?: boolean; no_staff?: boolean },
): Promise<
  | string
  | {
      subject: string;
      method: string;
      email: string;
      name: string;
      preferred_username: string;
      picture: string;
      groups: string[];
    }
> {
  const consent = {
    config: config,
  };
  const context = {
    login_method: login_method,
  };
  let user: {
    method: string;
    subject: string;
    email: string;
    name: string;
    preferred_username: string;
    picture: string;
    groups: string[];
  } | null = null;

  switch (context.login_method) {
    case "roblox":
      const [userFetch, avatarFetch] = await Promise.all([
        fetch(`https://users.roblox.com/v1/users/${userId}`),
        fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&format=Png&size=150x150`,
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
      if (!userData1) return "NO_USER_IN_DB";
      if (!avatar) return "NO_USER_IN_DB";
      user = {
        subject: `roblox|${userId}`,
        method: context.login_method,
        email: `${userData1.id}@students.bloxvalschools.com`,
        name: `${userData1.displayName} (@${userData1.name})`,
        preferred_username: userData1.name,
        picture: avatar.data[0]!.imageUrl,
        groups: [],
      };
      break;
    case "discord":
      if (consent.config?.discord_direct) {
        const accountData = await db.query.account.findFirst({
          where(fields, operators) {
            return operators.eq(fields.accountId, userId);
          },
        });

        if (!accountData || accountData?.providerId !== "discord") {
          return "NO_DISCORD_ACCOUNT_DATA";
        }

        const userData = await db.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, accountData.userId);
          },
        });

        if (!userData) {
          return "NO_USER_IN_DB";
        }

        user = {
          subject: `discord|${userId}`,
          method: context.login_method,
          email: userData.email,
          name: userData.name,
          preferred_username: userData.email,
          picture: userData.image ?? "",
          groups: [],
        };
      } else {
        const account = await db.query.account.findFirst({
          where(fields, operators) {
            return operators.eq(fields.accountId, userId);
          },
        });
        if (!account) return "NO_USER_IN_DB";
        const userDb = await db.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, account.userId);
          },
        });
        const [userFetch, avatarFetch] = await Promise.all([
          fetch(
            `https://users.roblox.com/v1/users/${userDb?.connectedRobloxAccount}`,
          ),
          fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userDb?.connectedRobloxAccount}&format=Png&size=720x720`,
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
          subject: `roblox|${userDb?.connectedRobloxAccount}`,
          method: context.login_method,
          email: `${userData.id}@students.bloxvalschools.com`,
          name: `${userData.displayName} (@${userData.name})`,
          preferred_username: userData.name,
          picture: avatar.data[0]!.imageUrl,
          groups: [],
        };
      }
      break;
    case "microsoft":
      if (consent.config?.no_staff) {
        return "NO_STAFF";
      }
      const userData = await db.query.user.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, userId);
        },
      });
      if (!userData) {
        return "NO_USER_IN_DB";
      }

      user = {
        subject: `myteam|${userId}`,
        method: context.login_method,
        email: userData.email,
        name: userData.name,
        preferred_username: userData.email,
        picture: userData.image!,
        groups: JSON.parse(userData.groups) as string[],
      };

      break;
    default:
      if (!user) return "NO_USER_OBJECT";
  }

  if (!user) return "NO_USER_OBJECT";
  return user;
}
