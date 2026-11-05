import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { boolean, description, enabled, id, timestamps } from '@/drizzle/lib/columns.helpers'
import { encryptedText } from '@/drizzle/lib/schema-types'

export const variables = sqliteTable(
	'deployer_variables',
	{
		id,
		name: text().unique('deployer_variable_unq_name').notNull(),
		slug: text().unique('deployer_variable_unq_slug').notNull(),
		description,
		enabled,
		is_secret: boolean,
		value: encryptedText('value', { condition: 'is_secret' }),
		...timestamps,
	},
	table => [index('deployer_variable_idx_enabled').on(table.enabled)],
)
