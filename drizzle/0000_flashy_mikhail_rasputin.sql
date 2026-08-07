CREATE TABLE `bcps-orylogin_flow_popup` (
	`id` text PRIMARY KEY NOT NULL,
	`return_url` text NOT NULL,
	`saml_request` text,
	`selected_account` text,
	`status` text,
	`client_id` text,
	`provided_consent` integer NOT NULL,
	`session_id` text,
	FOREIGN KEY (`selected_account`) REFERENCES `bcps-orylogin_social_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `bcps-orylogin_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_secret` text NOT NULL,
	`name` text NOT NULL,
	`consent_needed` integer NOT NULL,
	`jwt_signing_algorithm` text DEFAULT 'ES256' NOT NULL,
	`post_logout_redirect_uris` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`frontchannel_logout_uri` text NOT NULL,
	`backchannel_logout_uri` text NOT NULL,
	`grants` text NOT NULL,
	`home_url` text NOT NULL,
	`auth` text DEFAULT 'oauth2' NOT NULL,
	`authentication_methods` text NOT NULL,
	`with_no_staff` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`jwt_signing_algorithm`) REFERENCES `bcps-orylogin_oauth2_keys`(`alg`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `id_idx` ON `bcps-orylogin_oauth2_client` (`id`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`alg` text NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_oauth2_keys_alg_unique` ON `bcps-orylogin_oauth2_keys` (`alg`);--> statement-breakpoint
CREATE UNIQUE INDEX `alg_unique` ON `bcps-orylogin_oauth2_keys` (`alg`);--> statement-breakpoint
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
	`force_roblox_account` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `bcps-orylogin_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `access_token_idx` ON `bcps-orylogin_oauth2_login_session` (`access_token`);--> statement-breakpoint
CREATE INDEX `refresh_token_idx` ON `bcps-orylogin_oauth2_login_session` (`refresh_token`);--> statement-breakpoint
CREATE INDEX `client_id_idx` ON `bcps-orylogin_oauth2_login_session` (`client_id`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_oauth2_logout_session` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text,
	`post_logout_redirect_uri` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logout_id_unique` ON `bcps-orylogin_oauth2_logout_session` (`id`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_session_token_unique` ON `bcps-orylogin_session` (`token`);--> statement-breakpoint
CREATE INDEX `session_id_idx` ON `bcps-orylogin_session` (`id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `bcps-orylogin_session` (`user_id`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_social_users` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_type` text NOT NULL,
	`account_id` text NOT NULL,
	`display_name` text,
	`username` text,
	`image` text,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bcps-orylogin_user` (
	`id` text PRIMARY KEY NOT NULL,
	`groups` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `bcps-orylogin_user` (`id`);--> statement-breakpoint
CREATE TABLE `bcps-orylogin_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
