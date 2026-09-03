import type { JSONContent } from '@tiptap/vue-3'

import { integer, text } from 'drizzle-orm/sqlite-core'

export const timestamps = {
	updated_at: text()
		.notNull()
		.$default(() => new Date().toISOString())
		.$onUpdate(() => new Date().toISOString()),

	created_at: text()
		.notNull()
		.$default(() => new Date().toISOString()),
	deleted_at: text(),
}

export const description = text({ mode: 'json' })
	.$type<JSONContent>()
	.notNull()
	.default({ type: 'doc', content: [{ type: 'paragraph' }] })

export const enabled = integer({ mode: 'boolean' }).notNull().default(false)

export const file_table = {
	id: integer().primaryKey({ autoIncrement: true }),
	module_id: integer().notNull(),
	file_path: text().notNull(),
	content: text().notNull().default(''),
	is_binary: integer({ mode: 'boolean' }).notNull().default(false),
	name: text().notNull(),
	mime_type: text(),
	file_type: text({ enum: ['compose', 'composer', 'env', 'other'] })
		.notNull()
		.default('other'),
	size: integer(),
	last_modified: integer(),
	webkit_relative_path: text(),
	icon: text().notNull().default('i-vscode-icons-default-file'),
	...timestamps,
}
