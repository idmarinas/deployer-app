import { useDeployerSettingsQuery } from "./queries/deployerSettings"

export function useQuery() {
  const deployerSettingsQuery = useDeployerSettingsQuery()

  return {
    ...deployerSettingsQuery
  }
}
