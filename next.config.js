/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import "./src/env.js";

initOpenNextCloudflareForDev();

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["@libsql/isomorphic-ws"],
};

export default config;
