import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cache_projects_docker_search = sqliteTable(
	'deployer_cache_projects_docker_search',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		query: text().notNull(),
		namespace: text().notNull(),
		repository: text().notNull(),
		description: text(),
		pull_count: integer('pull_count').default(0).notNull(),
		star_count: integer('star_count').default(0).notNull(),
		fetched_at: text()
			.notNull()
			.$default(() => new Date().toISOString()),
	},
	table => [index('deployer_docker_hub_search_cache_idx_query').on(table.query)],
)
