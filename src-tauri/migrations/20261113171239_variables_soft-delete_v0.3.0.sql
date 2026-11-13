CREATE TABLE `deployer_variables` (
	`id` integer AUTOINCREMENT,
	`name` text NOT NULL CONSTRAINT `deployer_variable_unq_name` UNIQUE,
	`slug` text NOT NULL CONSTRAINT `deployer_variable_unq_slug` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_variable_pk_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_deployer_hosts` (
	`id` integer AUTOINCREMENT,
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
	CONSTRAINT `deployer_host_pk_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_deployer_hosts_key_id_deployer_passkeys_id_fk` FOREIGN KEY (`key_id`) REFERENCES `deployer_passkeys`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
INSERT INTO `__new_deployer_hosts`(`id`, `name`, `description`, `enabled`, `host`, `port`, `username`, `auth_type`, `password`, `key_id`, `system_info`, `status_info`, `server_updates`, `updated_at`, `created_at`, `deleted_at`) SELECT `id`, `name`, `description`, `enabled`, `host`, `port`, `username`, `auth_type`, `password`, `key_id`, `system_info`, `status_info`, `server_updates`, `updated_at`, `created_at`, `deleted_at` FROM `deployer_hosts`;--> statement-breakpoint
DROP TABLE `deployer_hosts`;--> statement-breakpoint
ALTER TABLE `__new_deployer_hosts` RENAME TO `deployer_hosts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_deployer_passkeys` (
	`id` integer AUTOINCREMENT,
	`name` text NOT NULL CONSTRAINT `deployer_passkeys_unq_name` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`key_content` text NOT NULL,
	`public_key` text,
	`passphrase` text,
	`key_type` text DEFAULT 'ed25519' NOT NULL,
	`fingerprint` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_passkey_pk_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_deployer_passkeys`(`id`, `name`, `description`, `enabled`, `key_content`, `public_key`, `passphrase`, `key_type`, `fingerprint`, `updated_at`, `created_at`, `deleted_at`) SELECT `id`, `name`, `description`, `enabled`, `key_content`, `public_key`, `passphrase`, `key_type`, `fingerprint`, `updated_at`, `created_at`, `deleted_at` FROM `deployer_passkeys`;--> statement-breakpoint
DROP TABLE `deployer_passkeys`;--> statement-breakpoint
ALTER TABLE `__new_deployer_passkeys` RENAME TO `deployer_passkeys`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `deployer_host_idx_key_id` ON `deployer_hosts` (`key_id`);--> statement-breakpoint
CREATE INDEX `deployer_host_idx_enabled` ON `deployer_hosts` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_passkeys_idx_enabled` ON `deployer_passkeys` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_variable_idx_enabled` ON `deployer_variables` (`enabled`);