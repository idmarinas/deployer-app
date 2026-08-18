import { sql } from 'drizzle-orm'
import { index, integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { encryptedText } from '../schema-types'
import { passkeys } from './passkeys'

export const hosts = sqliteTable(
	'deployer_hosts',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		name: text().notNull(),
		host: text().notNull(),
		port: integer().default(22).notNull(),
		username: text().default('').notNull(),
		auth_type: text().notNull(),
		password: encryptedText('password'),
		key_id: integer().references(() => passkeys.id, { onDelete: 'set null' }),
		description: text(),
		enabled: integer({ mode: 'boolean' }).notNull().default(true),
		system_info: text('system_info').default('{}').notNull(),
		status_info: text('status_info').default('{}').notNull(),
		server_updates: text('server_updates').default('{}').notNull(),
		created_at: numeric('created_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
		updated_at: numeric('updated_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
	},
	table => [index('deployer_hosts_idx_key_id').on(table.key_id), index('deployer_hosts_idx_enabled').on(table.enabled)],
)
