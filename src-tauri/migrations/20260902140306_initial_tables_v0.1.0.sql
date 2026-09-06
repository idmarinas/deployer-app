CREATE TABLE `deployer_cache_projects_docker_search` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`query` text NOT NULL,
	`namespace` text NOT NULL,
	`repository` text NOT NULL,
	`description` text,
	`pull_count` integer DEFAULT 0 NOT NULL,
	`star_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deployer_cache_projects_docker_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`namespace` text NOT NULL,
	`repository` text NOT NULL,
	`url_query` text NOT NULL,
	`url_next` text,
	`url_previous` text,
	`count` integer DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '{}' NOT NULL,
	`tags_versions` text DEFAULT '{}' NOT NULL,
	`tags_variants` text DEFAULT '{}' NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE `deployer_projects_docker_compose` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`description` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`host_id` integer,
	`remote_path` text DEFAULT '/opt/docker-compose/' NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_deployer_projects_docker_compose_host_id_deployer_hosts_id_fk` FOREIGN KEY (`host_id`) REFERENCES `deployer_hosts`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `deployer_projects_docker_compose_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`module_id` integer NOT NULL,
	`file_path` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`is_binary` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`mime_type` text,
	`file_type` text DEFAULT 'other' NOT NULL,
	`size` integer,
	`last_modified` integer,
	`webkit_relative_path` text,
	`icon` text DEFAULT 'i-vscode-icons-default-file' NOT NULL,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT `fk_deployer_projects_docker_compose_files_module_id_deployer_projects_docker_compose_id_fk` FOREIGN KEY (`module_id`) REFERENCES `deployer_projects_docker_compose`(`id`) ON DELETE CASCADE
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
CREATE INDEX `deployer_docker_hub_search_cache_idx_query` ON `deployer_cache_projects_docker_search` (`query`);--> statement-breakpoint
CREATE INDEX `deployer_cache_projects_docker_tags_idx_ns_repo` ON `deployer_cache_projects_docker_tags` (`namespace`,`repository`);--> statement-breakpoint
CREATE INDEX `deployer_cache_projects_docker_tags_idx_url_query` ON `deployer_cache_projects_docker_tags` (`url_query`);--> statement-breakpoint
CREATE INDEX `deployer_cache_projects_docker_tags_idx_url_next` ON `deployer_cache_projects_docker_tags` (`url_next`);--> statement-breakpoint
CREATE INDEX `deployer_cache_projects_docker_tags_idx_url_previous` ON `deployer_cache_projects_docker_tags` (`url_previous`);--> statement-breakpoint
CREATE INDEX `deployer_host_idx_key_id` ON `deployer_hosts` (`key_id`);--> statement-breakpoint
CREATE INDEX `deployer_host_idx_enabled` ON `deployer_hosts` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_passkeys_idx_enabled` ON `deployer_passkeys` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_idx_name` ON `deployer_projects_docker_compose` (`name`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_idx_host_id` ON `deployer_projects_docker_compose` (`host_id`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_idx_enabled` ON `deployer_projects_docker_compose` (`enabled`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_files_idx_name` ON `deployer_projects_docker_compose_files` (`name`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_files_idx_file_path` ON `deployer_projects_docker_compose_files` (`file_path`);--> statement-breakpoint
CREATE INDEX `deployer_projects_docker_compose_files_idx_module_id` ON `deployer_projects_docker_compose_files` (`module_id`);