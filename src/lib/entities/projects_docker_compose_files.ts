import { sql } from 'drizzle-orm'
import { index, integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { projects_docker_compose } from './projects_docker_compose'

export const projects_docker_compose_files = sqliteTable(
	'deployer_projects_docker_compose_files',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		module_id: integer('module_id')
			.notNull()
			.references(() => projects_docker_compose.id, { onDelete: 'cascade' }),
		file_path: text('file_path').notNull(),
		content: text(),
		is_binary: integer('is_binary', { mode: 'boolean' }).notNull().default(false),
		name: text().notNull(),
		mime_type: text('mime_type'),
		size: integer(),
		last_modified: integer('last_modified'),
		webkit_relative_path: text('webkit_relative_path'),
		icon: text(),
		created_at: numeric('created_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
		updated_at: numeric('updated_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
	},
	table => [
		index('deployer_docker_compose_files_idx_name').on(table.name),
		index('deployer_docker_compose_files_idx_file_path').on(table.file_path),
		index('deployer_docker_compose_files_idx_module_id').on(table.module_id),
	],
)
