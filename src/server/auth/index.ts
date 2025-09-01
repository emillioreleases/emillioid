import { betterAuth } from "better-auth";
import { multiSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "~/env";
import { db } from "~/server/db"; // your drizzle instance
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { cfCtx } from "~/utils/cloudflare";
import { diff } from "json-diff-ts";

export const auth = betterAuth({
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      disableIpTracking: false,
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite", // or "mysql", "sqlite"
  }),
  socialProviders: {
    discord: {
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
      overrideUserInfoOnSignIn: true,
      async getUserInfo(accessToken) {
        const discordFetch = await fetch("https://discord.com/api/users/@me", {
          headers: {
            Authorization: `Bearer ${accessToken.accessToken}`,
          },
        });

        const discordData = await discordFetch.json<{
          id: string;
          username: string;
          global_name?: string;
          email: string;
          discriminator: string;
          avatar: string;
          verified: boolean;
          image_url: string;
        }>();

        const existingUser = await db.query.user.findFirst({
          where: eq(user.id, discordData.id),
          columns: {
            connectedRobloxAccount: true,
          },
        });

        if (existingUser) {
          if (existingUser.connectedRobloxAccount) {
            try {
              const [userFetch, avatarFetch] = await Promise.all([
                fetch(
                  `https://users.roblox.com/v1/users/${existingUser.connectedRobloxAccount}`,
                ),
                fetch(
                  `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${existingUser.connectedRobloxAccount}&format=Png&size=150x150`,
                ),
              ]);
              const [userData1, avatar] = (await Promise.all([
                userFetch.json(),
                avatarFetch.json(),
              ])) as [
                {
                  displayName: string;
                  name: string;
                  id: string;
                  profileUrl: string;
                },
                {
                  data: {
                    imageUrl: string;
                  }[];
                },
              ];
              if (userData1 && avatar) {
                const user = await cfCtx.env.USERS_KV.get<{
                  i: string;
                  d: string;
                  u: string;
                  au: string;
                }>("roblox|" + userData1.id, "json");
                if (!user) {
                  await cfCtx.env.USERS_KV.put(
                    "roblox|" + userData1.id,
                    JSON.stringify({
                      i: userData1.id,
                      d: userData1.displayName,
                      u: userData1.name,
                      au: avatar.data[0]?.imageUrl,
                    }),
                  );
                } else {
                  const differences = diff(user, {
                    i: userData1.id,
                    d: userData1.displayName,
                    u: userData1.name,
                    au: avatar.data[0]?.imageUrl,
                  });
                  if (differences.length > 0) {
                    await cfCtx.env.USERS_KV.put(
                      "roblox|" + userData1.id,
                      JSON.stringify({
                        i: userData1.id,
                        d: userData1.displayName,
                        u: userData1.name,
                        au: avatar.data[0]?.imageUrl,
                      }),
                    );
                  }
                }
              }
            } catch {}
          }
        }

        if (discordData.avatar === null) {
          const defaultAvatarNumber =
            discordData.discriminator === "0"
              ? Number(BigInt(discordData.id) >> BigInt(22)) % 6
              : parseInt(discordData.discriminator) % 5;
          discordData.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        } else {
          const format = discordData.avatar.startsWith("a_") ? "gif" : "png";
          discordData.image_url = `https://cdn.discordapp.com/avatars/${discordData.id}/${discordData.avatar}.${format}`;
        }

        return {
          user: {
            id: discordData.id,
            name: discordData.global_name
              ? discordData.global_name + " (@" + discordData.username + ")"
              : discordData.username,
            email: discordData.email,
            image: discordData.image_url,
            emailVerified: discordData.verified,
          },
          data: null,
        };
      },
    },
    roblox: {
      clientId: env.AUTH_ROBLOX_ID,
      clientSecret: env.AUTH_ROBLOX_SECRET,
      overrideUserInfoOnSignIn: true,
      async getUserInfo(accessToken) {
        const oidcFetch = await fetch(
          "https://apis.roblox.com/oauth/v1/userinfo",
          {
            headers: {
              Authorization: `Bearer ${accessToken.accessToken}`,
            },
          },
        );

        const oidcData = await oidcFetch.json<{
          sub: string;
          name: string;
          nickname: string;
          preferred_username: string;
          picture: string;
          profile: string;
        }>();

        const user = await cfCtx.env.USERS_KV.get<{
          i: string;
          d: string;
          u: string;
          au: string;
        }>("roblox|" + oidcData.sub, "json");
        if (!user) {
          await cfCtx.env.USERS_KV.put(
            "roblox|" + oidcData.sub,
            JSON.stringify({
              i: oidcData.sub,
              d: oidcData.nickname,
              u: oidcData.preferred_username,
              au: oidcData.picture,
            }),
          );
        } else {
          const differences = diff(user, {
            i: oidcData.sub,
            d: oidcData.nickname,
            u: oidcData.preferred_username,
            au: oidcData.picture,
          });
          if (differences.length > 0) {
            await cfCtx.env.USERS_KV.put(
              "roblox|" + oidcData.sub,
              JSON.stringify({
                i: oidcData.sub,
                d: oidcData.nickname,
                u: oidcData.preferred_username,
                au: oidcData.picture,
              }),
            );
          }
        }

        return {
          user: {
            id: oidcData.sub,
            email: oidcData.sub + "@accounts.emillio.dev",
            name: oidcData.nickname + " (@" + oidcData.preferred_username + ")",
            image: oidcData.picture,
            groups: JSON.stringify([]),
            emailVerified: true,
            connectedRobloxAccount: oidcData.sub,
            verifiedWanted: true,
          },
          data: null,
        };
      },
    },
  },
  plugins: [multiSession()],
  user: {
    additionalFields: {
      connectedRobloxAccount: {
        type: "string",
        required: false,
        input: false, // don't allow user to set role
      },
      groups: {
        type: "string",
        required: false,
        input: false, // don't allow user to set role
      },
    },
  },
  session: {
    additionalFields: {
      orySessions: {
        type: "string",
        required: true,
        defaultValue: JSON.stringify([]),
        input: false, // don't allow user to set role
      },
      oryClientSessions: {
        type: "string",
        required: true,
        defaultValue: JSON.stringify([]),
        input: false, // don't allow user to set role
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          if (u.email.endsWith("@accounts.emillio.dev")) {
            await db
              .update(user)
              .set({
                connectedRobloxAccount: u.email.split("@")[0],
                verifiedWanted: true,
              })
              .where(eq(user.id, u.id));
          }
        },
      },
      update: {
        after: async (u) => {
          if (u.email.endsWith("@accounts.emillio.dev")) {
          }
        },
      },
    },
    session: {
      create: {
        before: async (s) => {
          const user = await db.query.user.findFirst({
            where(fields, operators) {
              return operators.eq(fields.id, s.userId);
            },
          });

          if (user?.email.endsWith("@bloxvalschools.com")) {
          }
        },
      },
    },
  },
});
