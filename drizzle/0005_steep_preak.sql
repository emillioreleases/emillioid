PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bcps-orylogin_oauth2_client` (
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
	`with_discord_direct` integer NOT NULL,
	`with_no_staff` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`jwt_signing_algorithm`) REFERENCES `bcps-orylogin_oauth2_keys`(`alg`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bcps-orylogin_oauth2_client`("id", "client_secret", "name", "consent_needed", "jwt_signing_algorithm", "post_logout_redirect_uris", "redirect_uris", "frontchannel_logout_uri", "backchannel_logout_uri", "grants", "home_url", "with_discord_direct", "with_no_staff", "created_at", "updated_at") SELECT "id", "client_secret", "name", "consent_needed", "jwt_signing_algorithm", "post_logout_redirect_uris", "redirect_uris", "frontchannel_logout_uri", "backchannel_logout_uri", "grants", "home_url", "with_discord_direct", "with_no_staff", "created_at", "updated_at" FROM `bcps-orylogin_oauth2_client`;--> statement-breakpoint
DROP TABLE `bcps-orylogin_oauth2_client`;--> statement-breakpoint
ALTER TABLE `__new_bcps-orylogin_oauth2_client` RENAME TO `bcps-orylogin_oauth2_client`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `id_idx` ON `bcps-orylogin_oauth2_client` (`id`);