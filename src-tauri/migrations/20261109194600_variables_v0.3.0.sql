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
CREATE INDEX `deployer_variable_idx_enabled` ON `deployer_variables` (`enabled`);