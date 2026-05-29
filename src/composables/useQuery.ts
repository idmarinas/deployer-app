import { useDeployerSettingsQuery } from "./queries/deployerSettings"
import { useHostQuery } from "./queries/hosts"
import { usePasskeysQuery } from "./queries/passkeys"
import { useDatabase } from '@/composables/useDatabase'

export function useQuery() {
  const { db: database } = useDatabase()

  const deployerSettingsQuery = useDeployerSettingsQuery()
  const hostQuery = useHostQuery()
  const passkeysQuery = usePasskeysQuery()


  async function count(table: string, where: string): Promise<number> {
    return database.value!.select<{ count: number }[]>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where} LIMIT 1`)
      .then((res) => {
        console.log(res)
        return res[0].count
      })
      .catch(() => -1)
      .finally(() => 0)
  }

  return {
    // Deployer Settings
    ...deployerSettingsQuery,

    // Hosts
    ...hostQuery,

    // Passkeys
    ...passkeysQuery,


    // Common
    count
  }
}