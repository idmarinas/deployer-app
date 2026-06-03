import { useDeployerSettingsQuery } from "./queries/deployerSettings"
import { usePasskeysQuery } from "./queries/passkeys"
import { useDatabase } from '@/composables/useDatabase'

export function useQuery() {
  const { db: database } = useDatabase()

  const deployerSettingsQuery = useDeployerSettingsQuery()
  const passkeysQuery = usePasskeysQuery()


  async function count(table: string, where: string): Promise<number> {
    return database.value!.select<{ count: number }[]>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where} LIMIT 1`)
      .then((res) => {
        return res[0].count
      })
      .catch(() => -1)
      .finally(() => 0)
  }

  return {
    // Deployer Settings
    ...deployerSettingsQuery,

    // Passkeys
    ...passkeysQuery,


    // Common
    count
  }
}