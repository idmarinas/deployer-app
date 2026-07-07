import { useVariablesQuery } from '@/composables/queries/global_variables'
import { useProjectQuery } from '@/composables/queries/projects'

export function useQuery() {
	return {
		// Projects (Drizzle Relational Queries)
		projects: useProjectQuery(),

		// Global Variables (Drizzle Relational Queries)
		globalVariables: useVariablesQuery(),
	}
}
