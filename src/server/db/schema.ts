import {
  index,
  sqliteTableCreator,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { type importJWK, type JWK } from "jose";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `bcps-orylogin_${name}`,
);

export const user = createTable(
  "user",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groups: d.text("groups").default(JSON.stringify([])).notNull(),
    createdAt: d
      .integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d
      .integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("user_id_idx").on(t.id)],
);

export const socialUsers = createTable("social_users", (d) => ({
  id: d
    .text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: d
    .text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  accountType: d
    .text("account_type", { enum: ["roblox", "discord"] })
    .notNull(),
  accountId: d.text("account_id").notNull(),
  display_name: d.text("display_name"),
  username: d.text("username"),
  image: d.text("image"),
}));

export const session = createTable(
  "session",
  (d) => ({
    id: d.text("id").primaryKey(),
    expiresAt: d.integer("expires_at", { mode: "timestamp" }).notNull(),
    token: d.text("token").notNull().unique(),
    createdAt: d.integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: d.integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: d.text("ip_address"),
    userAgent: d.text("user_agent"),
    userId: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("session_id_idx").on(t.id),
    index("session_user_id_idx").on(t.userId),
  ],
);

export const flowPopup = createTable("flow_popup", (d) => ({
  id: d
    .text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  returnUrl: d.text("return_url").notNull(),
  saml_request: d.text("saml_request"),
  selected_account: d.text("selected_account").references(() => socialUsers.id),
  status: d.text("status", {
    enum: ["forced_login", "select_account", "complete"],
  }),
  session_id: d.text("session_id").references(() => session.id),
}));

export const verification = createTable("verification", (d) => ({
  id: d.text("id").primaryKey(),
  identifier: d.text("identifier").notNull(),
  value: d.text("value").notNull(),
  expiresAt: d.integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: d
    .integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: d
    .integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date()),
}));

export const oauth2Client = createTable(
  "oauth2_client",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientSecret: d.text("client_secret").notNull(),
    name: d.text("name").notNull(),
    consentNeeded: d
      .integer("consent_needed", { mode: "boolean" })
      .notNull()
      .$defaultFn(() => true),
    jwtSigningAlgorithm: d
      .text("jwt_signing_algorithm")
      .references(() => oauth2Keys.alg)
      .default("ES256")
      .notNull(),
    postLogoutRedirectUris: d
      .text("post_logout_redirect_uris", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    redirectUris: d
      .text("redirect_uris", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    frontchannelLogoutUri: d.text("frontchannel_logout_uri").notNull(),
    backchannelLogoutUri: d.text("backchannel_logout_uri").notNull(),
    grants: d.text("grants").notNull(),
    homeUrl: d.text("home_url").notNull(),
    with_discord_direct: d
      .integer("with_discord_direct", { mode: "boolean" })
      .notNull()
      .$defaultFn(() => false),
    with_no_staff: d
      .integer("with_no_staff", { mode: "boolean" })
      .notNull()
      .$defaultFn(() => false),
    createdAt: d.integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: d.integer("updated_at", { mode: "timestamp" }).notNull(),
  }),
  (t) => [index("id_idx").on(t.id)],
);

export const oauth2Consent = createTable("oauth2_consent", (d) => ({
  id: d
    .text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  client_id: d
    .text("client_id")
    .notNull()
    .references(() => oauth2Client.id, { onDelete: "cascade" }),
  user_id: d
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  scopes: d.text("scopes").notNull(),
  created_at: d.integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: d.integer("updated_at", { mode: "timestamp" }).notNull(),
}));

export const oauth2LogoutSession = createTable(
  "oauth2_logout_session",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    client_id: d
      .text("client_id")
      .notNull()
      .references(() => oauth2Client.id, { onDelete: "cascade" }),
    user_id: d.text("user_id").references(() => user.id),
    post_logout_redirect_uri: d.text("post_logout_redirect_uri").notNull(),
    created_at: d.integer("created_at", { mode: "timestamp" }).notNull(),
    updated_at: d.integer("updated_at", { mode: "timestamp" }).notNull(),
  }),
  (t) => [uniqueIndex("logout_id_unique").on(t.id)],
);

export const oauth2LoginSession = createTable(
  "oauth2_login_session",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    id_token: d.text("id_token"),
    access_token: d.text("access_token"),
    refresh_token: d.text("refresh_token"),
    authorization_code: d.text("authorization_code"),
    code_verifier: d.text("code_verifier"),
    redirect_uri: d.text("redirect_uri"),
    session_id: d
      .text("session_id")
      .notNull()
      .references(() => session.id, { onDelete: "cascade" }),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    client_id: d
      .text("client_id")
      .notNull()
      .references(() => oauth2Client.id, { onDelete: "cascade" }),
    scope: d.text("scope").notNull(),
    token_type: d.text("token_type").notNull(),
    force_roblox_account: d
      .integer("force_roblox_account", { mode: "boolean" })
      .notNull()
      .default(false),
    created_at: d.integer("created_at", { mode: "timestamp" }).notNull(),
    updated_at: d.integer("updated_at", { mode: "timestamp" }).notNull(),
  }),
  (t) => [
    index("access_token_idx").on(t.access_token),
    index("refresh_token_idx").on(t.refresh_token),
    index("client_id_idx").on(t.client_id),
  ],
);

export const oauth2Keys = createTable(
  "oauth2_keys",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    alg: d.text().notNull().unique(),
    public_key: d.text({ mode: "json" }).$type<JWK>().notNull(),
    private_key: d.text({ mode: "json" }).$type<JWK>().notNull(),
  }),
  (t) => [uniqueIndex("alg_unique").on(t.alg)],
);
