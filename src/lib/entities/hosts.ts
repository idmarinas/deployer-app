import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { encryptedText } from '../schema-types'
import { passkeys } from './passkeys'

import { HostServerUpdates, HostStatusMetrics, HostSystemInfo } from '@/types/tauri-types'
import { description, enabled, timestamps } from '../columns.helpers'

export const hosts = sqliteTable(
	'deployer_hosts',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		name: text().unique('deployer_host_unq_name').notNull(),
		description,
		enabled,
		host: text().notNull(),
		port: integer().notNull().default(22),
		username: text().notNull().default(''),
		auth_type: text({ enum: ['key', 'password'] })
			.notNull()
			.default('password'),
		password: encryptedText('password'),
		key_id: integer().references(() => passkeys.id, { onDelete: 'set null' }),
		system_info: text({ mode: 'json' })
			.$type<HostSystemInfo>()
			.notNull()
			.default({} as HostSystemInfo),
		status_info: text({ mode: 'json' })
			.$type<HostStatusMetrics>()
			.notNull()
			.default({} as HostStatusMetrics),
		server_updates: text({ mode: 'json' })
			.$type<HostServerUpdates>()
			.notNull()
			.default({} as HostServerUpdates),
		...timestamps,
	},
	table => [index('deployer_host_idx_key_id').on(table.key_id), index('deployer_host_idx_enabled').on(table.enabled)],
)
