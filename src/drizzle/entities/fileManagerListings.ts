import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { timestamps } from '@/drizzle/lib/columns.helpers'

/**
 * Instantánea de un panel del gestor: `local:<ruta>` o `remote:<host_id>:<ruta>`.
 * Solo guarda metadatos de UI y rutas, nunca contenido de archivos.
 */
export const fileManagerListings = sqliteTable(
	'deployer_file_manager_listings',
	{
		scope_key: text().notNull(),
		origin: text({ enum: ['local', 'remote'] }).notNull(),
		host_id: integer(),
		path: text().notNull(),
		snapshot: text().notNull().default('{}'),
		truncated: integer({ mode: 'boolean' }).notNull().default(false),
		...timestamps,
	},
	table => [
		primaryKey({ name: 'deployer_file_manager_listings_pk_scope', columns: [table.scope_key] }),
		index('deployer_file_manager_listings_idx_host').on(table.host_id),
	],
)
