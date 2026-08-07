/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  cacheComponents: true,
  serverExternalPackages: ["@libsql/isomorphic-ws"],
  experimental: {
    useTypeScriptCli: true,
  },
};

export default config;
