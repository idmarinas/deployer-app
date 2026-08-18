import { sql } from 'drizzle-orm'
import { index, integer, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { hosts } from './hosts'

export const projects_docker_compose = sqliteTable(
	'deployer_projects_docker_compose',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		name: text().notNull(),
		description: text(),
		host_id: integer().references(() => hosts.id, { onDelete: 'set null' }),
		remote_path: text('remote_path').default('/opt/docker-compose/').notNull(),
		enabled: integer({ mode: 'boolean' }).notNull().default(true),
		created_at: numeric('created_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
		updated_at: numeric('updated_at')
			.default(sql`(CURRENT_TIMESTAMP)`)
			.notNull(),
	},
	table => [
		index('deployer_docker_composes_idx_name').on(table.name),
		index('deployer_docker_composes_idx_host_id').on(table.host_id),
		index('deployer_docker_composes_idx_enabled').on(table.enabled),
	],
)
