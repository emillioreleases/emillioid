import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `bcps-orylogin_${name}`,
);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    createdById: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const user = createTable("user", (d) => ({
  id: d.text("id").primaryKey(),
  name: d.text("name").notNull(),
  email: d.text("email").notNull().unique(),
  emailVerified: d
    .integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: d.text("image"),
  connectedRobloxAccount: d.text("connected_roblox_account"),
  groups: d.text("groups").default(JSON.stringify([])).notNull(),
  verifiedWanted: d
    .integer("verified_wanted", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt: d
    .integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: d
    .integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}));

export const session = createTable("session", (d) => ({
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
  orySessions: d.text("ory_sessions"),
}));

export const account = createTable("account", (d) => ({
  id: d.text("id").primaryKey(),
  accountId: d.text("account_id").notNull(),
  providerId: d.text("provider_id").notNull(),
  userId: d
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: d.text("access_token"),
  refreshToken: d.text("refresh_token"),
  idToken: d.text("id_token"),
  accessTokenExpiresAt: d.integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: d.integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: d.text("scope"),
  password: d.text("password"),
  createdAt: d.integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: d.integer("updated_at", { mode: "timestamp" }).notNull(),
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
