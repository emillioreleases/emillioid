CREATE INDEX `id_idx` ON `bcps-orylogin_oauth2_client` (`id`);--> statement-breakpoint
CREATE INDEX `access_token_idx` ON `bcps-orylogin_oauth2_login_session` (`access_token`);--> statement-breakpoint
CREATE INDEX `refresh_token_idx` ON `bcps-orylogin_oauth2_login_session` (`refresh_token`);--> statement-breakpoint
CREATE INDEX `client_id_idx` ON `bcps-orylogin_oauth2_login_session` (`client_id`);