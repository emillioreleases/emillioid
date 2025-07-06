PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bcps-orylogin_oauth2_logout_session` (
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
INSERT INTO `__new_bcps-orylogin_oauth2_logout_session`("id", "client_id", "user_id", "post_logout_redirect_uri", "created_at", "updated_at") SELECT "id", "client_id", "user_id", "post_logout_redirect_uri", "created_at", "updated_at" FROM `bcps-orylogin_oauth2_logout_session`;--> statement-breakpoint
DROP TABLE `bcps-orylogin_oauth2_logout_session`;--> statement-breakpoint
ALTER TABLE `__new_bcps-orylogin_oauth2_logout_session` RENAME TO `bcps-orylogin_oauth2_logout_session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `logout_id_unique` ON `bcps-orylogin_oauth2_logout_session` (`id`);