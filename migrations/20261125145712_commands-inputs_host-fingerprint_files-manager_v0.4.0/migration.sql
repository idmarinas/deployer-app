CREATE TABLE `deployer_file_manager_listings` (
	`scope_key` text NOT NULL,
	`origin` text NOT NULL,
	`host_id` integer,
	`path` text NOT NULL,
	`snapshot` text DEFAULT '{}' NOT NULL,
	`truncated` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_file_manager_listings_pk_scope` PRIMARY KEY(`scope_key`)
);
--> statement-breakpoint
CREATE TABLE `deployer_file_manager_preferences` (
	`key` text NOT NULL,
	`value` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_file_manager_preferences_pk_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `deployer_file_manager_transfers` (
	`job_key` text NOT NULL,
	`host_id` integer NOT NULL,
	`direction` text NOT NULL,
	`source_path` text,
	`target_path` text,
	`label` text,
	`status` text NOT NULL,
	`retry_of` text,
	`snapshot` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_file_manager_transfers_pk_job` PRIMARY KEY(`job_key`)
);
--> statement-breakpoint
ALTER TABLE `deployer_commands` ADD `inputs` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `deployer_hosts` ADD `host_key_fingerprint` text;--> statement-breakpoint
ALTER TABLE `deployer_hosts` ADD `default_remote_path` text DEFAULT '/';--> statement-breakpoint
CREATE INDEX `deployer_file_manager_listings_idx_host` ON `deployer_file_manager_listings` (`host_id`);--> statement-breakpoint
CREATE INDEX `deployer_file_manager_transfers_idx_created_at` ON `deployer_file_manager_transfers` (`created_at`);