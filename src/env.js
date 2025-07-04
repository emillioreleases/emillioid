import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_MICROSOFT_ID: z.string(),
    AUTH_MICROSOFT_SECRET: z.string(),
    AUTH_MICROSOFT_TENANT_ID: z.string(),
    AUTH_ROBLOX_ID: z.string(),
    AUTH_ROBLOX_SECRET: z.string(),
    AF_ID: z.string(),
    AF_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    DATABASE_TOKEN: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    OAUTH2_TOKEN_SIGN_KEY: z.string(),
    OAUTH2_TOKEN_ENCRYPT_KEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    AUTH_MICROSOFT_ID: process.env.AUTH_MICROSOFT_ID,
    AUTH_MICROSOFT_SECRET: process.env.AUTH_MICROSOFT_SECRET,
    AUTH_MICROSOFT_TENANT_ID: process.env.AUTH_MICROSOFT_TENANT_ID,
    AUTH_ROBLOX_ID: process.env.AUTH_ROBLOX_ID,
    AUTH_ROBLOX_SECRET: process.env.AUTH_ROBLOX_SECRET,
    AF_ID: process.env.AF_ID,
    AF_SECRET: process.env.AF_SECRET,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_TOKEN: process.env.DATABASE_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    OAUTH2_TOKEN_SIGN_KEY: process.env.OAUTH2_TOKEN_SIGN_KEY,
    OAUTH2_TOKEN_ENCRYPT_KEY: process.env.OAUTH2_TOKEN_ENCRYPT_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
