import { sqliteTable, foreignKey, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const bcpsOryloginAccount = sqliteTable("bcps-orylogin_account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => bcpsOryloginUser.id, { onDelete: "cascade" } ),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const bcpsOryloginPost = sqliteTable("bcps-orylogin_post", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text({ length: 256 }),
	createdById: text({ length: 255 }).notNull().references(() => bcpsOryloginUser.id),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer(),
},
(table) => [
	index("name_idx").on(table.name),
	index("created_by_idx").on(table.createdById),
]);

export const bcpsOryloginSession = sqliteTable("bcps-orylogin_session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at").notNull(),
	token: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => bcpsOryloginUser.id, { onDelete: "cascade" } ),
	orySessions: text("ory_sessions").default("[]").notNull(),
	oryClientSessions: text("ory_client_sessions").default("[]").notNull(),
},
(table) => [
	uniqueIndex("bcps-orylogin_session_token_unique").on(table.token),
]);

export const bcpsOryloginUser = sqliteTable("bcps-orylogin_user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: integer("email_verified").notNull(),
	image: text(),
	connectedRobloxAccount: text("connected_roblox_account"),
	groups: text().default("[]").notNull(),
	verifiedWanted: integer("verified_wanted").default(false).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
},
(table) => [
	uniqueIndex("bcps-orylogin_user_email_unique").on(table.email),
]);

export const bcpsOryloginVerification = sqliteTable("bcps-orylogin_verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const bcpsOryloginOauth2Client = sqliteTable("bcps-orylogin_oauth2_client", {
	id: text().primaryKey().notNull(),
	clientSecret: text("client_secret").notNull(),
	consentNeeded: integer("consent_needed").default(true).notNull(),
	postLogoutRedirectUris: text("post_logout_redirect_uris").notNull(),
	redirectUris: text("redirect_uris").notNull(),
	frontchannelLogoutUri: text("frontchannel_logout_uri").notNull(),
	backchannelLogoutUri: text("backchannel_logout_uri").notNull(),
	grants: text().notNull(),
	homeUrl: text("home_url").notNull(),
	withDiscordDirect: integer("with_discord_direct").default(false).notNull(),
	withNoStaff: integer("with_no_staff").default(false).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	name: text().notNull(),
	jwtSigningAlgorithm: text("jwt_signing_algorithm"),
});

export const bcpsOryloginOauth2Consent = sqliteTable("bcps-orylogin_oauth2_consent", {
	id: text().primaryKey().notNull(),
	challenge: text().notNull(),
	loginSessionId: text("login_session_id").notNull(),
	clientId: text("client_id").notNull().references(() => bcpsOryloginOauth2Client.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull(),
	scopes: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const bcpsOryloginOauth2Keys = sqliteTable("bcps-orylogin_oauth2_keys", {
	id: text().primaryKey().notNull(),
	alg: text().notNull(),
	publicKey: text("public_key").notNull(),
	privateKey: text("private_key").notNull(),
});

export const bcpsOryloginOauth2LoginAttempt = sqliteTable("bcps-orylogin_oauth2_login_attempt", {
	id: text().primaryKey().notNull(),
	clientId: text("client_id").notNull().references(() => bcpsOryloginOauth2Client.id, { onDelete: "cascade" } ),
	loginHint: text("login_hint"),
	redirectUri: text("redirect_uri").notNull(),
	responseType: text("response_type").notNull(),
	scope: text().notNull(),
	state: text(),
	nonce: text(),
	userId: text("user_id").references(() => bcpsOryloginUser.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	prompt: text(),
	promptBypass: integer("prompt_bypass").default(false).notNull(),
});

export const bcpsOryloginOauth2LoginSession = sqliteTable("bcps-orylogin_oauth2_login_session", {
	id: text().primaryKey().notNull(),
	idToken: text("id_token"),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	authorizationCode: text("authorization_code"),
	codeVerifier: text("code_verifier"),
	sessionId: text("session_id").notNull().references(() => bcpsOryloginSession.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull().references(() => bcpsOryloginUser.id, { onDelete: "cascade" } ),
	clientId: text("client_id").notNull().references(() => bcpsOryloginOauth2Client.id, { onDelete: "cascade" } ),
	scope: text().notNull(),
	tokenType: text("token_type").notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	redirectUri: text("redirect_uri"),
});

