CREATE TABLE `bcps-orylogin_flow_popup` (
	`id` text PRIMARY KEY NOT NULL,
	`return_url` text NOT NULL,
	`saml_request` text,
	`selected_account` text,
	`status` text,
	`session_id` text,
	FOREIGN KEY (`selected_account`) REFERENCES `bcps-orylogin_social_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `bcps-orylogin_session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
DROP TABLE `bcps-orylogin_account`;--> statement-breakpoint
DROP TABLE `bcps-orylogin_oauth2_login_attempt`;--> statement-breakpoint
DROP TABLE `bcps-orylogin_post`;--> statement-breakpoint
DROP INDEX `bcps-orylogin_user_email_unique`;--> statement-breakpoint
DROP INDEX `user_email_idx`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `email_verified`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `image`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `connected_roblox_account`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_user` DROP COLUMN `verified_wanted`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_consent` ALTER COLUMN "user_id" TO "user_id" text NOT NULL REFERENCES bcps-orylogin_user(id) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_consent` DROP COLUMN `challenge`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_consent` DROP COLUMN `login_session_id`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_session` DROP COLUMN `ory_sessions`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_session` DROP COLUMN `ory_client_sessions`;