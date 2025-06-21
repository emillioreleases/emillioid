CREATE TABLE `bcps-orylogin_account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_secret` text NOT NULL,
	`name` text NOT NULL,
	`consent_needed` integer NOT NULL,
	`jwt_signing_algorithm` text,
	`post_logout_redirect_uris` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`frontchannel_logout_uri` text NOT NULL,
	`backchannel_logout_uri` text NOT NULL,
	`grants` text NOT NULL,
	`home_url` text NOT NULL,
	`with_discord_direct` integer NOT NULL,
	`with_no_staff` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`jwt_signing_algorithm`) REFERENCES `bcps-orylogin_oauth2_keys`(`alg`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`login_session_id` text NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`alg` text NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_login_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`login_hint` text,
	`redirect_uri` text NOT NULL,
	`response_type` text NOT NULL,
	`scope` text NOT NULL,
	`state` text,
	`nonce` text,
	`user_id` text,
	`prompt` text,
	`prompt_bypass` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_login_session` (
	`id` text PRIMARY KEY NOT NULL,
	`id_token` text,
	`access_token` text,
	`refresh_token` text,
	`authorization_code` text,
	`code_verifier` text,
	`redirect_uri` text,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`scope` text NOT NULL,
	`token_type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `bcps-orylogin_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`createdById` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `bcps-orylogin_post` (`createdById`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `bcps-orylogin_post` (`name`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`ory_sessions` text DEFAULT '[]' NOT NULL,
	`ory_client_sessions` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_session_token_unique` ON `bcps-orylogin_session` (`token`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`connected_roblox_account` text,
	`groups` text DEFAULT '[]' NOT NULL,
	`verified_wanted` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_user_email_unique` ON `bcps-orylogin_user` (`email`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
