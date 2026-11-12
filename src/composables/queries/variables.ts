import type { Variable } from '@/types/entities'
import type { VariableUpdateData } from '@/utils/variables'

import { createCrudQuery } from '@/composables/queries/crud'
import { variables } from '@/drizzle/schema'
import { normalizeVariableUpdate } from '@/utils/variables'

/**
 * CRUD de variables globales.
 *
 * El `slug` es inmutable y `is_secret` es unidireccional; ambas invariantes
 * viven en {@link normalizeVariableUpdate}.
 */
export function useVariableQuery() {
	return createCrudQuery<typeof variables, number, Omit<Variable, 'id'>, VariableUpdateData>({
		table: variables,
		primaryKey: variables.id,
		cacheKey: 'variables',
		i18nPrefix: 'notifications.variables',
		nameOf: row => row.name,
		toUpdate: (current, data) => normalizeVariableUpdate(current, data),
		softDelete: {
			deletedAt: variables.deleted_at,
			updatedAt: variables.updated_at,
		},
	})
}
