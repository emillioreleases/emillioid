CREATE TABLE `bcps-orylogin_oauth2_logout_session` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`post_logout_redirect_uri` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `bcps-orylogin_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logout_id_unique` ON `bcps-orylogin_oauth2_logout_session` (`id`);--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_attempt` DROP COLUMN `is_a_logout`;