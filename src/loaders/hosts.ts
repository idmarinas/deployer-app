import type { CommandResponse, Host } from '@/types/tauri-types'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'
import { invoke } from '@tauri-apps/api/core'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hosts } from '@/lib/schema'

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

export interface HostSelectItem {
  id: number
  label: string
  username: string
  enabled: boolean
}

export const useHostSelectPopulate = defineColadaLoader({
  key: () => ['hosts', 'select', 'populate'],
  async query() {
    try {
      return await db
        .select({
          id: hosts.id,
          label: hosts.name,
          username: hosts.username,
          enabled: hosts.enabled,
        })
        .from(hosts)
        .orderBy(asc(hosts.name))
    } catch {
      return [] as HostSelectItem[]
    }
  }
})