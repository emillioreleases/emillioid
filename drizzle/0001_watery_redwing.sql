PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bcps-orylogin_flow_popup` (
	`id` text PRIMARY KEY NOT NULL,
	`return_url` text NOT NULL,
	`saml_request` text,
	`selected_account` text,
	`status` text,
	`client_id` text,
	`provided_consent` integer NOT NULL,
	`session_id` text,
	FOREIGN KEY (`selected_account`) REFERENCES `bcps-orylogin_social_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `bcps-orylogin_oauth2_client`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `bcps-orylogin_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bcps-orylogin_flow_popup`("id", "return_url", "saml_request", "selected_account", "status", "client_id", "provided_consent", "session_id") SELECT "id", "return_url", "saml_request", "selected_account", "status", "client_id", "provided_consent", "session_id" FROM `bcps-orylogin_flow_popup`;--> statement-breakpoint
DROP TABLE `bcps-orylogin_flow_popup`;--> statement-breakpoint
ALTER TABLE `__new_bcps-orylogin_flow_popup` RENAME TO `bcps-orylogin_flow_popup`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `bcps-orylogin_oauth2_login_session` ADD `social_user_id` text NOT NULL REFERENCES bcps-orylogin_social_users(id);