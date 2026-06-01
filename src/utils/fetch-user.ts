"use cache";
import { cacheTag } from "next/cache";
import { db } from "~/server/db";

export default async function fetchUser(
  userId: string,
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
    login_method: "",
    profile_to_use: "",
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

  const userData = await db.query.user.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, userId);
    },
    columns: {
      name: true,
      image: true,
      email: true,
      connectedRobloxAccount: true,
    },
  });

  context.profile_to_use = !config.discord_direct ? "roblox" : "discord";

  cacheTag(
    context.profile_to_use + "|" + (userData?.connectedRobloxAccount || userId),
  );

  switch (context.profile_to_use) {
    case "roblox":
      const [thumbnailRaw, userRaw] = await Promise.all([
        fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=720x720&format=Png&isCircular=false`,
        ),
        fetch("https://users.roblox.com/v1/users", {
          method: "POST",
          body: JSON.stringify({
            userIds: [userId],
            excludeBannedUsers: true,
          }),
        }),
      ]);
      const [kvUser, thumbnail] = await Promise.all([
        userRaw.json<{
          data: {
            hasVerifiedBadge: boolean;
            id: number;
            name: string;
            displayName: string;
          }[];
        }>(),
        thumbnailRaw.json<{
          data: {
            targetId: number;
            state: string;
            imageUrl: string;
            version: string;
          }[];
        }>(),
      ]);
      if (!kvUser.data[0]) return "NO_USER_IN_DB";
      user = {
        subject: `roblox|${userId}`,
        method: context.login_method,
        email: `${kvUser.data[0].id}@accounts.emillio.dev`,
        name: `${kvUser.data[0].displayName} (@${kvUser.data[0].name})`,
        preferred_username: kvUser.data[0].name,
        picture: thumbnail.data[0]!.imageUrl,
        groups: [],
      };
      break;
    case "discord":
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
      break;
    default:
      return "NO_USER_OBJECT";
  }

  return user;
}
