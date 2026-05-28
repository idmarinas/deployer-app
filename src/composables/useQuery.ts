import { useDeployerSettingsQuery } from "./queries/deployerSettings"
import { useHostQuery } from "./queries/hosts"
import { usePasskeysQuery } from "./queries/passkeys"

export function useQuery() {
  const deployerSettingsQuery = useDeployerSettingsQuery()
  const hostQuery = useHostQuery()
  const passkeysQuery = usePasskeysQuery()

  return {
    // Deployer Settings
    ...deployerSettingsQuery,

    // Hosts
    ...hostQuery,

    // Passkeys
    ...passkeysQuery
  }
}