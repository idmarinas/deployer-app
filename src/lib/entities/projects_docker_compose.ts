import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { description, enabled, timestamps } from '../columns.helpers'
import { hosts } from './hosts'

export const projects_docker_compose = sqliteTable(
	'deployer_projects_docker_compose',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		name: text().notNull(),
		description,
		enabled,
		host_id: integer().references(() => hosts.id, { onDelete: 'set null' }),
		remote_path: text('remote_path').default('/opt/docker-compose/').notNull(),
		...timestamps,
	},
	table => [
		index('deployer_projects_docker_compose_idx_name').on(table.name),
		index('deployer_projects_docker_compose_idx_host_id').on(table.host_id),
		index('deployer_projects_docker_compose_idx_enabled').on(table.enabled),
	],
)
