import { sqliteTable, integer, text, numeric, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const deployer_docker_hub_tags_cache = sqliteTable('deployer_docker_hub_tags_cache', {
  id: integer().primaryKey({ autoIncrement: true }),
  namespace: text().notNull(),
  repository: text().notNull(),
  url_query: text('url_query').notNull(),
  url_next: text('url_next'),
  url_previous: text('url_previous'),
  count: integer().default(0).notNull(),
  tags: text().notNull(),
  tags_versions: text('tags_versions').notNull(),
  tags_variants: text('tags_variants').notNull(),
  fetched_at: numeric('fetched_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
  index('deployer_docker_hub_tags_cache_idx_ns_repo').on(table.namespace, table.repository),
])
