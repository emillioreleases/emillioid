CREATE INDEX `account_user_id_idx` ON `bcps-orylogin_account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_id_idx` ON `bcps-orylogin_session` (`id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `bcps-orylogin_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `bcps-orylogin_user` (`id`);