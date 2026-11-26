import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { description, enabled, timestamps } from '@/drizzle/lib/columns.helpers'
import { encryptedText } from '@/drizzle/lib/schema-types'
import { HostServerUpdates, HostStatusMetrics, HostSystemInfo } from '@/types/entities'
import { passkeys } from './passkeys'

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
		/** Huella SHA256 de la clave del servidor, confirmada por el usuario. */
		host_key_fingerprint: text(),
		/** Directorio base del gestor de archivos; no es el `working_dir` de los comandos. */
		default_remote_path: text().default('/'),
		key_id: integer().references(() => passkeys.id, { onDelete: 'restrict' }),
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
