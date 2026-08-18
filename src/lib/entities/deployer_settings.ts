import { sqliteTable, text, numeric } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const deployer_settings = sqliteTable('deployer_settings', {
  key: text().primaryKey(),
  value: text(),
  created_at: numeric('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updated_at: numeric('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})
