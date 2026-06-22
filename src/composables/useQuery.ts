import { useDatabase } from '@/composables/useDatabase'

import { useDeployerSettingsQuery } from './queries/deployerSettings'
import { useDeploymentHistoryQuery } from './queries/deploymentHistory'

export function useQuery() {
	const { db: database } = useDatabase()

	const deployerSettingsQuery = useDeployerSettingsQuery()
	const deploymentHistoryQuery = useDeploymentHistoryQuery()

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
		// Deployer Settings
		...deployerSettingsQuery,
		// Deployment History
		...deploymentHistoryQuery,

		// Common
		count,
	}
}
