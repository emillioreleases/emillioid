import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "~/env";
import { db } from "~/server/db"; // your drizzle instance
import { user } from "../db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite", // or "mysql", "sqlite"
  }),
  socialProviders: {
    discord: {
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
      overrideUserInfoOnSignIn: true,
    },
    roblox: {
        clientId: env.AUTH_ROBLOX_ID,
        clientSecret: env.AUTH_ROBLOX_SECRET,
        overrideUserInfoOnSignIn: true,
        async getUserInfo(accessToken) {
            const oidcFetch = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
                headers: {
                    Authorization: `Bearer ${accessToken.accessToken}`
                }
            });
            const oidcData = await oidcFetch.json() as {
                sub: string;
                name: string;
                nickname: string;
                preferred_username: string;
                picture: string;
                profile: string;
            };

            return {
                user: {
                    id: oidcData.sub,
                    email: oidcData.sub + "@students.bloxvalschools.com",
                    name: oidcData.nickname+" (@"+oidcData.preferred_username+")",
                    image: oidcData.picture,
                    groups: JSON.stringify([]),
                    emailVerified: true,
                    connectedRobloxAccount: oidcData.sub,
                    verifiedWanted: true,
                },
                data: null,
            };
        }
    },
    microsoft: {
      clientId: env.AUTH_MICROSOFT_ID,
      clientSecret: env.AUTH_MICROSOFT_SECRET,
      scope: [
        "openid",
        "profile",
        "email",
        "User.Read",
        "CustomSecAttributeAssignment.Read.All",
        "CustomSecAttributeDefinition.Read.All",
      ],
      tenantId: env.AUTH_MICROSOFT_TENANT_ID,
      overrideUserInfoOnSignIn: true,
      async getUserInfo(accessToken) {
        const [userFetch, groupsFetch] = await Promise.all([
          fetch(
            "https://graph.microsoft.com/v1.0/me?$select=id,mail,displayName,givenName,surName,customSecurityAttributes",
            { headers: { Authorization: `Bearer ${accessToken.accessToken}` } },
          ),
          fetch(
            "https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.group?$select=displayName",
            { headers: { Authorization: `Bearer ${accessToken.accessToken}` } },
          ),
        ]);
        const [user, groups] = (await Promise.all([
          userFetch.json(),
          groupsFetch.json(),
        ])) as [
          {
            id: string;
            mail: string;
            displayName: string;
            givenName: string;
            surname: string;
            customSecurityAttributes: Record<string, Record<string, string>>;
          },
          { value: { displayName: string }[] },
        ];
        return {
          user: {
            id: user.id,
            email: user.mail,
            name: `${user.givenName} ${user.surname}`,
            image: `https://mtav.bloxvalschools.com/${user.mail.split("@")[0]}`,
            groups: JSON.stringify(groups.value.map((g) => g.displayName)),
            emailVerified: true,
            connectedRobloxAccount: user.customSecurityAttributes.socialIDs
              ? user.customSecurityAttributes.socialIDs.robloxID
              : null,
            verifiedWanted: true,
          },
          data: null,
        };
      },
    },
  },
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
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          if (u.email.endsWith("@students.bloxvalschools.com")) {
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
          if (u.email.endsWith("@students.bloxvalschools.com")) {
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
