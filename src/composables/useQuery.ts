import { useVariablesQuery } from '@/composables/queries/global_variables'
import { useProjectQuery } from '@/composables/queries/projects'
import { useDatabase } from '@/composables/useDatabase'

export function useQuery() {
	const { db: database } = useDatabase()

	async function count(table: string, where: string): Promise<number> {
		return database
			.value!.select<{ count: number }[]>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where} LIMIT 1`)
			.then(res => {
				return res[0].count
			})
			.catch(() => -1)
			.finally(() => 0)
	}

	return {
		// Projects (Drizzle Relational Queries)
		projects: useProjectQuery(),

		// Global Variables (Drizzle Relational Queries)
		globalVariables: useVariablesQuery(),

		// Common
		count,
	}
}
