import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'
import { invoke } from '@tauri-apps/api/core'
import { CommandResponse, type Host } from '@/types/tauri-types'

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