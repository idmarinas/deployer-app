CREATE TABLE `deployer_hosts` (
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
	CONSTRAINT `fk_deployer_hosts_key_id_deployer_passkeys_id_fk` FOREIGN KEY (`key_id`) REFERENCES `deployer_passkeys`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `deployer_passkeys` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL CONSTRAINT `deployer_passkeys_unq_name` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`key_content` text NOT NULL,
	`passphrase` text,
	`key_type` text DEFAULT 'ed25519' NOT NULL,
	`fingerprint` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `deployer_settings` (
	`key` text NOT NULL,
	`value` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_settings_pk_id` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `deployer_host_idx_key_id` ON `deployer_hosts` (`key_id`);--> statement-breakpoint
CREATE INDEX `deployer_host_idx_enabled` ON `deployer_hosts` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_passkeys_idx_enabled` ON `deployer_passkeys` (`enabled`);