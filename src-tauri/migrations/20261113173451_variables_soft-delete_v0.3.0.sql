CREATE TABLE `deployer_variables` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL CONSTRAINT `deployer_variable_unq_name` UNIQUE,
	`slug` text NOT NULL CONSTRAINT `deployer_variable_unq_slug` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_deployer_hosts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL CONSTRAINT `deployer_host_unq_name` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`host` text NOT NULL,
	`port` integer DEFAULT 22 NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`auth_type` text DEFAULT 'password' NOT NULL,
	`password` text,
	`key_id` integer,
	`system_info` text DEFAULT '{}' NOT NULL,
	`status_info` text DEFAULT '{}' NOT NULL,
	`server_updates` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_deployer_hosts_key_id_deployer_passkeys_id_fk` FOREIGN KEY (`key_id`) REFERENCES `deployer_passkeys`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
INSERT INTO `__new_deployer_hosts`(`id`, `name`, `description`, `enabled`, `host`, `port`, `username`, `auth_type`, `password`, `key_id`, `system_info`, `status_info`, `server_updates`, `updated_at`, `created_at`, `deleted_at`) SELECT `id`, `name`, `description`, `enabled`, `host`, `port`, `username`, `auth_type`, `password`, `key_id`, `system_info`, `status_info`, `server_updates`, `updated_at`, `created_at`, `deleted_at` FROM `deployer_hosts`;--> statement-breakpoint
DROP TABLE `deployer_hosts`;--> statement-breakpoint
ALTER TABLE `__new_deployer_hosts` RENAME TO `deployer_hosts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `deployer_host_idx_key_id` ON `deployer_hosts` (`key_id`);--> statement-breakpoint
CREATE INDEX `deployer_host_idx_enabled` ON `deployer_hosts` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_variable_idx_enabled` ON `deployer_variables` (`enabled`);