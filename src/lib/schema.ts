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
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_settings = sqliteTable("deployer_settings", {
	key: text().primaryKey(),
	value: text(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_passkeys = sqliteTable("deployer_passkeys", {
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
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_hosts = sqliteTable("deployer_hosts", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	host: text().notNull(),
	port: integer().default(22).notNull(),
	username: text().default("").notNull(),
	auth_type: text().notNull(),
	password: text(),
	key_id: integer().references(() => deployer_passkeys.id, { onDelete: "set null" } ),
	description: text(),
	enabled: integer({ mode: 'boolean' }).notNull().default(true),
	system_info: text().default("{}").notNull(),
	status_info: text().default("{}").notNull(),
	server_updates: text().default("{}").notNull(),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployer_hosts_idx_key_id").on(table.key_id),
	index("deployer_hosts_idx_enabled").on(table.enabled),
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_docker_composes = sqliteTable("deployer_docker_composes", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	description: text(),
	compose_content: text().default("").notNull(),
	host_id: integer().references(() => deployer_hosts.id, { onDelete: "cascade" } ),
	remote_path: text().default("/opt/docker-compose/docker-compose.yml").notNull(),
	enabled: integer({ mode: 'boolean' }).notNull().default(true),
	created_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployer_docker_composes_idx_enabled").on(table.enabled),
	index("deployer_docker_composes_idx_host_id").on(table.host_id),
	index("deployer_docker_composes_idx_name").on(table.name),
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_docker_hub_search_cache = sqliteTable("deployer_docker_hub_search_cache", {
	id: integer().primaryKey({ autoIncrement: true }),
	query: text().notNull(),
	namespace: text().notNull(),
	repository: text().notNull(),
	description: text(),
	pull_count: integer().default(0).notNull(),
	star_count: integer().default(0).notNull(),
	fetched_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployer_docker_hub_search_cache_idx_query").on(table.query),
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

export const deployer_docker_hub_tags_cache = sqliteTable("deployer_docker_hub_tags_cache", {
	id: integer().primaryKey({ autoIncrement: true }),
	namespace: text().notNull(),
	repository: text().notNull(),
	tag_name: text().notNull(),
	last_updated: text(),
	full_size: integer().default(0).notNull(),
	fetched_at: numeric().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("deployer_docker_hub_tags_cache_idx_ns_repo").on(table.namespace, table.repository),
	check("deployer_passkeys_chk_key_type", sql`key_type IN ('rsa', 'ed25519', 'ecdsa'`),
	check("deployer_hosts_chk_auth_type", sql`auth_type IN ('password', 'key'`),
]);

