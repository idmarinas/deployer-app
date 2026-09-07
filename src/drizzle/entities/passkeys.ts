import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { description, enabled, timestamps } from '@/drizzle/lib/columns.helpers'
import { encryptedText } from '@/drizzle/lib/schema-types'

export const passkeys = sqliteTable(
	'deployer_passkeys',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		name: text().notNull().unique('deployer_passkeys_unq_name'),
		description,
		enabled,
		key_content: encryptedText('key_content').notNull(),
		passphrase: encryptedText('passphrase'),
		key_type: text({ enum: ['rsa', 'ed25519', 'ecdsa'] })
			.notNull()
			.default('ed25519'),
		fingerprint: text(),
		...timestamps,
	},
	table => [index('deployer_passkeys_idx_enabled').on(table.enabled)],
)
