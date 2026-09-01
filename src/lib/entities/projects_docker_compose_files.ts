import { index, sqliteTable } from 'drizzle-orm/sqlite-core'
import { file_table } from '../columns.helpers'
import { projects_docker_compose } from './projects_docker_compose'

export const projects_docker_compose_files = sqliteTable(
	'deployer_projects_docker_compose_files',
	{
		...file_table,
		module_id: file_table.module_id.references(() => projects_docker_compose.id, { onDelete: 'cascade' }),
	},
	table => [
		index('deployer_projects_docker_compose_files_idx_name').on(table.name),
		index('deployer_projects_docker_compose_files_idx_file_path').on(table.file_path),
		index('deployer_projects_docker_compose_files_idx_module_id').on(table.module_id),
	],
)
