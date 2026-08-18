import { sql } from 'drizzle-orm'
import { numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('deployer_settings', {
	key: text().primaryKey(),
	value: text(),
	created_at: numeric('created_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
	updated_at: numeric('updated_at')
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
})
