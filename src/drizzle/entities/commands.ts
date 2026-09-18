import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { description, enabled, timestamps } from '@/drizzle/lib/columns.helpers'
import { OutputParser } from '@/utils/commands/types'

export const commands = sqliteTable(
	'deployer_commands',
	{
		key: text().notNull(),
		name: text().unique('deployer_command_unq_name').notNull(),
		description,
		command: text().notNull(),
		parser: text({ mode: 'json' }).$type<OutputParser>().notNull().default({ type: 'raw' }),
		timeout: integer().notNull().default(30),
		customized: integer({ mode: 'boolean' }).notNull().default(true),
		enabled,
		...timestamps,
	},
	table => [primaryKey({ name: 'deployer_commands_pk_id', columns: [table.key] })],
)
