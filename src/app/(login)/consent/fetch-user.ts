import { db } from "~/server/db";
import { cfCtx as cloudflare } from "~/utils/cloudflare";

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
  const cfCtx = await cloudflare;
  const consent = {
    config: config,
  };
  const context = {
    login_method: "",
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

  context.login_method = userData?.email.endsWith("@accounts.emillio.dev")
    ? "roblox"
    : "discord";

  switch (context.login_method) {
    case "roblox":
      const kvUser = await cfCtx.env.USERS_KV.get<{
        i: string;
        u: string;
        d: string;
        au: string;
      }>("roblox|" + userId, "json");
      if (!kvUser) return "NO_USER_IN_DB";
      user = {
        subject: `roblox|${userId}`,
        method: context.login_method,
        email: `${kvUser.i}@accounts.emillio.dev`,
        name: `${kvUser.d} (@${kvUser.u})`,
        preferred_username: kvUser.u,
        picture: kvUser.au,
        groups: [],
      };
      break;
    case "discord":
      if (consent.config?.discord_direct) {
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
        const userDb = await db.query.user.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, userId);
          },
          columns: {
            connectedRobloxAccount: true,
          },
        });

        const kvUser = await cfCtx.env.USERS_KV.get<{
          i: string;
          u: string;
          d: string;
          au: string;
        }>("roblox|" + userDb?.connectedRobloxAccount, "json");
        if (!kvUser) return "NO_USER_IN_DB";

        user = {
          subject: `roblox|${userDb?.connectedRobloxAccount}`,
          method: context.login_method,
          email: `${kvUser.i}@accounts.emillio.dev`,
          name: `${kvUser.d} (@${kvUser.u})`,
          preferred_username: kvUser.u,
          picture: kvUser.au,
          groups: [],
        };
      }
      break;
    default:
      if (!user) return "NO_USER_OBJECT";
  }

  if (!user) return "NO_USER_OBJECT";
  return user;
}
