DROP INDEX "id_idx";--> statement-breakpoint
DROP INDEX "bcps-orylogin_oauth2_keys_alg_unique";--> statement-breakpoint
DROP INDEX "alg_unique";--> statement-breakpoint
DROP INDEX "bcps-orylogin_oauth2_login_attempt_id_unique";--> statement-breakpoint
DROP INDEX "id_unique";--> statement-breakpoint
DROP INDEX "access_token_idx";--> statement-breakpoint
DROP INDEX "refresh_token_idx";--> statement-breakpoint
DROP INDEX "client_id_idx";--> statement-breakpoint
DROP INDEX "created_by_idx";--> statement-breakpoint
DROP INDEX "name_idx";--> statement-breakpoint
DROP INDEX "bcps-orylogin_session_token_unique";--> statement-breakpoint
DROP INDEX "bcps-orylogin_user_email_unique";--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` ALTER COLUMN "force_roblox_account" TO "force_roblox_account" integer NOT NULL DEFAULT false;--> statement-breakpoint
CREATE INDEX `id_idx` ON `bcps-orylogin_oauth2_client` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_oauth2_keys_alg_unique` ON `bcps-orylogin_oauth2_keys` (`alg`);--> statement-breakpoint
CREATE UNIQUE INDEX `alg_unique` ON `bcps-orylogin_oauth2_keys` (`alg`);--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_oauth2_login_attempt_id_unique` ON `bcps-orylogin_oauth2_login_attempt` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `id_unique` ON `bcps-orylogin_oauth2_login_attempt` (`id`);--> statement-breakpoint
CREATE INDEX `access_token_idx` ON `bcps-orylogin_oauth2_login_session` (`access_token`);--> statement-breakpoint
CREATE INDEX `refresh_token_idx` ON `bcps-orylogin_oauth2_login_session` (`refresh_token`);--> statement-breakpoint
CREATE INDEX `client_id_idx` ON `bcps-orylogin_oauth2_login_session` (`client_id`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `bcps-orylogin_post` (`createdById`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `bcps-orylogin_post` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_session_token_unique` ON `bcps-orylogin_session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `bcps-orylogin_user_email_unique` ON `bcps-orylogin_user` (`email`);--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` ALTER COLUMN "force_roblox_account" TO "force_roblox_account" integer NOT NULL;