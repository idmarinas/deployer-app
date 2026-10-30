CREATE TABLE `deployer_commands` (
	`key` text NOT NULL,
	`name` text NOT NULL CONSTRAINT `deployer_command_unq_name` UNIQUE,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`command` text NOT NULL,
	`parser` text DEFAULT '{"type":"raw"}' NOT NULL,
	`timeout` integer DEFAULT 30 NOT NULL,
	`custom` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`internal` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `deployer_commands_pk_id` PRIMARY KEY(`key`)
);
