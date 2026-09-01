import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cache_projects_docker_tags = sqliteTable(
	'deployer_cache_projects_docker_tags',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		namespace: text().notNull(),
		repository: text().notNull(),
		url_query: text().notNull(),
		url_next: text(),
		url_previous: text(),
		count: integer().notNull().default(0),
		tags: text({ mode: 'json' }).notNull().default({}),
		tags_versions: text({ mode: 'json' }).notNull().default({}),
		tags_variants: text({ mode: 'json' }).notNull().default({}),
		fetched_at: text()
			.notNull()
			.$default(() => new Date().toISOString()),
	},
	table => [
		index('deployer_cache_projects_docker_tags_idx_ns_repo').on(table.namespace, table.repository),
		index('deployer_cache_projects_docker_tags_idx_url_query').on(table.url_query),
		index('deployer_cache_projects_docker_tags_idx_url_next').on(table.url_next),
		index('deployer_cache_projects_docker_tags_idx_url_previous').on(table.url_previous),
	],
)
