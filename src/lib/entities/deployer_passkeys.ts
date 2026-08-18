import { sqliteTable, integer, text, numeric } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { encryptedText } from '../schema-types'

export const deployer_passkeys = sqliteTable('deployer_passkeys', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  key_content: encryptedText('key_content'),
  passphrase: encryptedText('passphrase'),
  key_type: text(),
  fingerprint: text(),
  description: text(),
  created_at: numeric('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updated_at: numeric('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})
