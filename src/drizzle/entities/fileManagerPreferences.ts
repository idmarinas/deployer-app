import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { timestamps } from '@/drizzle/lib/columns.helpers'

/**
 * Preferencias del gestor de archivos. Un registro por clave: añadir una
 * preferencia nueva no requiere migrar el esquema.
 */
export const fileManagerPreferences = sqliteTable(
	'deployer_file_manager_preferences',
	{
		key: text().notNull(),
		value: text(),
		...timestamps,
	},
	table => [primaryKey({ name: 'deployer_file_manager_preferences_pk_key', columns: [table.key] })],
)
