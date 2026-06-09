import type { CommandResponse, Host } from '@/types/tauri-types'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'
import { invoke } from '@tauri-apps/api/core'
import { useDatabase } from '@/composables/useDatabase'
import { DB_TABLES } from '@/constants/dbTables'

export const useHostById = defineColadaLoader('dashboard-hosts-id-edit', {
  key: to => ['hosts', `host-${to.params.id}`],
  async query(to) {
    const id = Number.parseInt(to.params.id)
    const result = await invoke<CommandResponse<Host>>('crud_get_host', { id })

    if (!result.success || !result.data) {
      throw new Error('not-found')
    }

    return result.data as Host
  }
})

export const useHostListAll = defineColadaLoader('dashboard-hosts', {
  key: () => ['hosts', 'all'],
  async query() {
    const result = await invoke<CommandResponse<Host[]>>('crud_list_hosts')

    if (!result.success || !result.data) {
      throw new Error('not-found')
    }

    return result.data || [] as Host[]
  }
})

export const useHostSelectPopulate = defineColadaLoader({
  key: () => ['hosts', 'select', 'populate'],
  async query() {
    const { db: database } = useDatabase()

    try {
      return await database.value?.select<Host[]>(`SELECT id, name AS label, username, enabled FROM ${DB_TABLES.HOSTS} ORDER BY name ASC`)
    } catch {
      return [] as Host[]
    }
  }
})