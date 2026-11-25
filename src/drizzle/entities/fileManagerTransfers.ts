import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { timestamps } from '@/drizzle/lib/columns.helpers'

/**
 * Historial de transferencias del gestor. Se conserva hasta que el usuario
 * pulsa «Limpiar terminados»; `snapshot` guarda el job completo serializado.
 */
export const fileManagerTransfers = sqliteTable(
	'deployer_file_manager_transfers',
	{
		job_key: text().notNull(),
		host_id: integer().notNull(),
		direction: text({ enum: ['upload', 'download'] }).notNull(),
		source_path: text(),
		target_path: text(),
		label: text(),
		status: text().notNull(),
		retry_of: text(),
		snapshot: text().notNull().default('{}'),
		...timestamps,
	},
	table => [
		primaryKey({ name: 'deployer_file_manager_transfers_pk_job', columns: [table.job_key] }),
		index('deployer_file_manager_transfers_idx_created_at').on(table.created_at),
	],
)
