// @ts-nocheck
import { sqliteTable, AnySQLiteColumn, check, integer, text, numeric, blob, index, foreignKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const _sqlx_migrations = sqliteTable("_sqlx_migrations", {
	version: integer().primaryKey(),
	description: text().notNull(),
	installed_on: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	success: numeric().notNull(),
	checksum: blob().notNull(),
	execution_time: integer().notNull(),
},
(table) => [
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployer_settings = sqliteTable("deployer_settings", {
	key: text().primaryKey(),
	value: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const encryption_config = sqliteTable("encryption_config", {
	id: integer().primaryKey({ autoIncrement: true }),
	table_name: text().notNull(),
	field_name: text().notNull(),
	encrypt: numeric().notNull(),
	expose: numeric().notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("encryption_config_idx_table_name").on(table.table_name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const passkeys = sqliteTable("passkeys", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	key_content: text().notNull(),
	passphrase: text(),
	key_type: text(),
	fingerprint: text(),
	description: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const hosts = sqliteTable("hosts", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	host: text().notNull(),
	port: integer().default(22).notNull(),
	username: text().default("").notNull(),
	auth_type: text().notNull(),
	password: text(),
	key_id: integer().references(() => passkeys.id, { onDelete: "set null" } ),
	description: text(),
	enabled: numeric().default(1).notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("hosts_idx_key_id").on(table.key_id),
	index("hosts_idx_enabled").on(table.enabled),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const global_variables = sqliteTable("global_variables", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	value: text().notNull(),
	is_secret: numeric().notNull(),
	description: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("global_variables_idx_name").on(table.name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const projects = sqliteTable("projects", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	description: text(),
	git_url: text(),
	framework: text().notNull(),
	local_working_dir: text(),
	remote_working_dir: text(),
	enabled: numeric().default(1).notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("projects_idx_enabled").on(table.enabled),
	index("projects_idx_name").on(table.name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const project_hosts = sqliteTable("project_hosts", {
	id: integer().primaryKey({ autoIncrement: true }),
	project_id: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	host_id: integer().notNull().references(() => hosts.id, { onDelete: "cascade" } ),
	deploy_order: integer(),
	enabled: numeric().default(1).notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_hosts_idx_deploy_order").on(table.deploy_order),
	index("project_hosts_idx_host_id").on(table.host_id),
	index("project_hosts_idx_project_id").on(table.project_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const project_variables = sqliteTable("project_variables", {
	id: integer().primaryKey({ autoIncrement: true }),
	project_id: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	name: text().notNull(),
	value: text().notNull(),
	is_secret: numeric().notNull(),
	description: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_variables_idx_name").on(table.name),
	index("project_variables_idx_project_id").on(table.project_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const framework_configs = sqliteTable("framework_configs", {
	id: integer().primaryKey({ autoIncrement: true }),
	project_id: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	framework: text().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	is_secret: numeric().notNull(),
	data_type: text().default("string").notNull(),
	description: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("framework_configs_idx_key").on(table.key),
	index("framework_configs_idx_framework").on(table.framework),
	index("framework_configs_idx_project_id").on(table.project_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const tasks = sqliteTable("tasks", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	description: text(),
	type: text().notNull(),
	command: text(),
	timeout: integer().default(300).notNull(),
	retry_count: integer().default(0).notNull(),
	retry_delay: integer().default(5).notNull(),
	enabled: numeric().default(1).notNull(),
	is_global: numeric().notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("tasks_idx_is_global").on(table.is_global),
	index("tasks_idx_enabled").on(table.enabled),
	index("tasks_idx_name").on(table.name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const project_tasks = sqliteTable("project_tasks", {
	id: integer().primaryKey({ autoIncrement: true }),
	project_id: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	task_id: integer().notNull().references(() => tasks.id, { onDelete: "cascade" } ),
	order_execution: integer().notNull(),
	enabled: numeric().default(1).notNull(),
	condition: text(),
	on_failure: text().default("stop").notNull(),
	config: text(),
	local_working_dir: text(),
	remote_working_dir: text(),
	retry_count: integer(),
	retry_delay: integer(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_tasks_idx_order_execution").on(table.order_execution),
	index("project_tasks_idx_task_id").on(table.task_id),
	index("project_tasks_idx_project_id").on(table.project_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const task_dependencies = sqliteTable("task_dependencies", {
	id: integer().primaryKey({ autoIncrement: true }),
	task_id: integer().notNull().references(() => project_tasks.id, { onDelete: "cascade" } ),
	depends_on_task_id: integer().notNull().references(() => project_tasks.id, { onDelete: "cascade" } ),
	dependency_type: text().default("success").notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("task_dependencies_idx_depends_on_task_id").on(table.depends_on_task_id),
	index("task_dependencies_idx_task_id").on(table.task_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployments = sqliteTable("deployments", {
	id: integer().primaryKey({ autoIncrement: true }),
	project_id: integer().notNull().references(() => projects.id, { onDelete: "cascade" } ),
	version: text().notNull(),
	tag: text().notNull(),
	build: integer().notNull(),
	status: text().default("pending").notNull(),
	started_at: numeric(),
	finished_at: numeric(),
	duration_seconds: integer(),
	triggered_by: text(),
	notes: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployments_idx_created_at").on(table.created_at),
	index("deployments_idx_version").on(table.version),
	index("deployments_idx_status").on(table.status),
	index("deployments_idx_project_id").on(table.project_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployment_executions = sqliteTable("deployment_executions", {
	id: integer().primaryKey({ autoIncrement: true }),
	deployment_id: integer().notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	host_id: integer().notNull().references(() => hosts.id, { onDelete: "cascade" } ),
	task_id: integer().notNull().references(() => project_tasks.id, { onDelete: "cascade" } ),
	status: text().default("pending").notNull(),
	exit_code: integer(),
	output: text(),
	error_message: text(),
	started_at: numeric(),
	finished_at: numeric(),
	duration_seconds: integer(),
	retry_attempt: integer().default(0).notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployment_executions_idx_status").on(table.status),
	index("deployment_executions_idx_task_id").on(table.task_id),
	index("deployment_executions_idx_host_id").on(table.host_id),
	index("deployment_executions_idx_deployment_id").on(table.deployment_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployment_rollbacks = sqliteTable("deployment_rollbacks", {
	id: integer().primaryKey({ autoIncrement: true }),
	deployment_id: integer().notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	rolled_back_to_deployment_id: integer().notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	status: text().default("pending").notNull(),
	reason: text(),
	triggered_by: text(),
	started_at: numeric(),
	finished_at: numeric(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployment_rollbacks_idx_status").on(table.status),
	index("deployment_rollbacks_idx_deployment_id").on(table.deployment_id),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

