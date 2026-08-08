DROP INDEX `access_token_idx`;--> statement-breakpoint
DROP INDEX `refresh_token_idx`;--> statement-breakpoint
DROP INDEX `client_id_idx`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` ADD `active_rtoken` text;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` ADD `has_authorization_code_been_used` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `login_session_id_idx` ON `bcps-orylogin_oauth2_login_session` (`id`);--> statement-breakpoint
CREATE INDEX `login_session_client_id_idx` ON `bcps-orylogin_oauth2_login_session` (`client_id`);--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` DROP COLUMN `id_token`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` DROP COLUMN `access_token`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` DROP COLUMN `refresh_token`;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` DROP COLUMN `authorization_code`;