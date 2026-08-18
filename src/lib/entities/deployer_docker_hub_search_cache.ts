import { sqliteTable, integer, text, numeric, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const deployer_docker_hub_search_cache = sqliteTable('deployer_docker_hub_search_cache', {
  id: integer().primaryKey({ autoIncrement: true }),
  query: text().notNull(),
  namespace: text().notNull(),
  repository: text().notNull(),
  description: text(),
  pull_count: integer('pull_count').default(0).notNull(),
  star_count: integer('star_count').default(0).notNull(),
  fetched_at: numeric('fetched_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('deployer_docker_hub_search_cache_idx_query').on(table.query),
])
