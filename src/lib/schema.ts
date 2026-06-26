import { sqliteTable, AnySQLiteColumn, check, integer, text, numeric, blob, index, foreignKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const sqlxMigrations = sqliteTable("_sqlx_migrations", {
	version: integer().primaryKey(),
	description: text().notNull(),
	installedOn: numeric("installed_on").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	success: numeric().notNull(),
	checksum: blob().notNull(),
	executionTime: integer("execution_time").notNull(),
},
(table) => [
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployerSettings = sqliteTable("deployer_settings", {
	key: text().primaryKey(),
	value: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const encryptionConfig = sqliteTable("encryption_config", {
	id: integer().primaryKey({ autoIncrement: true }),
	tableName: text("table_name").notNull(),
	fieldName: text("field_name").notNull(),
	encrypt: numeric().notNull(),
	expose: numeric().notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("encryption_config_idx_table_name").on(table.tableName),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const passkeys = sqliteTable("passkeys", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	keyContent: text("key_content").notNull(),
	passphrase: text(),
	keyType: text("key_type"),
	fingerprint: text(),
	description: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
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
	authType: text("auth_type").notNull(),
	password: text(),
	keyId: integer("key_id").references(() => passkeys.id, { onDelete: "set null" } ),
	description: text(),
	enabled: numeric().default(1).notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("hosts_idx_key_id").on(table.keyId),
	index("hosts_idx_enabled").on(table.enabled),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const globalVariables = sqliteTable("global_variables", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	value: text().notNull(),
	isSecret: numeric("is_secret").notNull(),
	description: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
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
	gitUrl: text("git_url"),
	framework: text().notNull(),
	localWorkingDir: text("local_working_dir"),
	remoteWorkingDir: text("remote_working_dir"),
	enabled: numeric().default(1).notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("projects_idx_enabled").on(table.enabled),
	index("projects_idx_name").on(table.name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const projectHosts = sqliteTable("project_hosts", {
	id: integer().primaryKey({ autoIncrement: true }),
	projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" } ),
	hostId: integer("host_id").notNull().references(() => hosts.id, { onDelete: "cascade" } ),
	deployOrder: integer("deploy_order"),
	enabled: numeric().default(1).notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_hosts_idx_deploy_order").on(table.deployOrder),
	index("project_hosts_idx_host_id").on(table.hostId),
	index("project_hosts_idx_project_id").on(table.projectId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const projectVariables = sqliteTable("project_variables", {
	id: integer().primaryKey({ autoIncrement: true }),
	projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" } ),
	name: text().notNull(),
	value: text().notNull(),
	isSecret: numeric("is_secret").notNull(),
	description: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_variables_idx_name").on(table.name),
	index("project_variables_idx_project_id").on(table.projectId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const frameworkConfigs = sqliteTable("framework_configs", {
	id: integer().primaryKey({ autoIncrement: true }),
	projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" } ),
	framework: text().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	isSecret: numeric("is_secret").notNull(),
	dataType: text("data_type").default("string").notNull(),
	description: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("framework_configs_idx_key").on(table.key),
	index("framework_configs_idx_framework").on(table.framework),
	index("framework_configs_idx_project_id").on(table.projectId),
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
	retryCount: integer("retry_count").default(0).notNull(),
	retryDelay: integer("retry_delay").default(5).notNull(),
	enabled: numeric().default(1).notNull(),
	isGlobal: numeric("is_global").notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("tasks_idx_is_global").on(table.isGlobal),
	index("tasks_idx_enabled").on(table.enabled),
	index("tasks_idx_name").on(table.name),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const projectTasks = sqliteTable("project_tasks", {
	id: integer().primaryKey({ autoIncrement: true }),
	projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" } ),
	taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" } ),
	orderExecution: integer("order_execution").notNull(),
	enabled: numeric().default(1).notNull(),
	condition: text(),
	onFailure: text("on_failure").default("stop").notNull(),
	config: text(),
	localWorkingDir: text("local_working_dir"),
	remoteWorkingDir: text("remote_working_dir"),
	retryCount: integer("retry_count"),
	retryDelay: integer("retry_delay"),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("project_tasks_idx_order_execution").on(table.orderExecution),
	index("project_tasks_idx_task_id").on(table.taskId),
	index("project_tasks_idx_project_id").on(table.projectId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const taskDependencies = sqliteTable("task_dependencies", {
	id: integer().primaryKey({ autoIncrement: true }),
	taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" } ),
	dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" } ),
	dependencyType: text("dependency_type").default("success").notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("task_dependencies_idx_depends_on_task_id").on(table.dependsOnTaskId),
	index("task_dependencies_idx_task_id").on(table.taskId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deployments = sqliteTable("deployments", {
	id: integer().primaryKey({ autoIncrement: true }),
	projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" } ),
	version: text().notNull(),
	tag: text().notNull(),
	build: integer().notNull(),
	status: text().default("pending").notNull(),
	startedAt: numeric("started_at"),
	finishedAt: numeric("finished_at"),
	durationSeconds: integer("duration_seconds"),
	triggeredBy: text("triggered_by"),
	notes: text(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployments_idx_created_at").on(table.createdAt),
	index("deployments_idx_version").on(table.version),
	index("deployments_idx_status").on(table.status),
	index("deployments_idx_project_id").on(table.projectId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deploymentExecutions = sqliteTable("deployment_executions", {
	id: integer().primaryKey({ autoIncrement: true }),
	deploymentId: integer("deployment_id").notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	hostId: integer("host_id").notNull().references(() => hosts.id, { onDelete: "cascade" } ),
	taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" } ),
	status: text().default("pending").notNull(),
	exitCode: integer("exit_code"),
	output: text(),
	errorMessage: text("error_message"),
	startedAt: numeric("started_at"),
	finishedAt: numeric("finished_at"),
	durationSeconds: integer("duration_seconds"),
	retryAttempt: integer("retry_attempt").default(0).notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployment_executions_idx_status").on(table.status),
	index("deployment_executions_idx_task_id").on(table.taskId),
	index("deployment_executions_idx_host_id").on(table.hostId),
	index("deployment_executions_idx_deployment_id").on(table.deploymentId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

export const deploymentRollbacks = sqliteTable("deployment_rollbacks", {
	id: integer().primaryKey({ autoIncrement: true }),
	deploymentId: integer("deployment_id").notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	rolledBackToDeploymentId: integer("rolled_back_to_deployment_id").notNull().references(() => deployments.id, { onDelete: "cascade" } ),
	status: text().default("pending").notNull(),
	reason: text(),
	triggeredBy: text("triggered_by"),
	startedAt: numeric("started_at"),
	finishedAt: numeric("finished_at"),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployment_rollbacks_idx_status").on(table.status),
	index("deployment_rollbacks_idx_deployment_id").on(table.deploymentId),
	check("passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
	check("deployments_chk_status", sql`status IN ('pending', 'running', 'success', 'failed'`),
]);

