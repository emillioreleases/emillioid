import { betterAuth } from "better-auth";
import { multiSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "~/env";
import { db } from "~/server/db"; // your drizzle instance
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { decodeJwt } from "jose";

let token_data: { access_token: string; expiry: number } | null = null;
async function getAccessToken() {
  if (token_data) {
    if (token_data.expiry > Date.now()) {
      return token_data.access_token;
    } else {
      token_data = null;
    }
  }

  if (!token_data) {
    const data = (await fetch(
      "https://login.microsoftonline.com/" +
        "22154f5d-99aa-441b-b2fb-faed3d21b3cb" +
        "/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.AF_ID,
          client_secret: env.AF_SECRET,
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
      },
    ).then((res) => res.json())) as { access_token: string; expiry: number };
    token_data = data;
    return data.access_token;
  }
}

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
        const oidcData = (await oidcFetch.json()) as {
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
    microsoft: {
      clientId: env.AUTH_MICROSOFT_ID,
      clientSecret: env.AUTH_MICROSOFT_SECRET,
      scope: ["openid", "profile", "email", "User.Read"],
      tenantId: env.AUTH_MICROSOFT_TENANT_ID,
      overrideUserInfoOnSignIn: true,
      async getUserInfo(accessToken) {
        const at = await getAccessToken();
        const idToken = decodeJwt(accessToken.idToken!);
        const [userFetch, attributeFetch, groupsFetch] = await Promise.all([
          fetch(
            "https://graph.microsoft.com/v1.0/me?$select=id,mail,displayName,givenName,surName",
            { headers: { Authorization: `Bearer ${accessToken.accessToken}` } },
          ),
          fetch(
            `https://graph.microsoft.com/v1.0/users/${idToken.oid as string}?$select=customSecurityAttributes`,
            { headers: { Authorization: `Bearer ${at}` } },
          ),
          fetch(
            `https://graph.microsoft.com/v1.0/users/${idToken.oid as string}/memberOf/microsoft.graph.group?$select=displayName`,
            { headers: { Authorization: `Bearer ${at}` } },
          ),
        ]);
        const [user, attributes, groups] = (await Promise.all([
          userFetch.json(),
          attributeFetch.json(),
          groupsFetch.json(),
        ])) as [
          {
            id: string;
            mail: string;
            displayName: string;
            givenName: string;
            surname: string;
          },
          {
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
            connectedRobloxAccount: attributes.customSecurityAttributes
              .socialIDs
              ? attributes.customSecurityAttributes.socialIDs.robloxID
              : null,
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
