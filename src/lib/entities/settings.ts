import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { timestamps } from '../columns.helpers'

export const settings = sqliteTable(
	'deployer_settings',
	{
		key: text().notNull(),
		value: text(),
		...timestamps,
	},
	table => [primaryKey({ name: 'deployer_settings_pk_id', columns: [table.key] })],
)
