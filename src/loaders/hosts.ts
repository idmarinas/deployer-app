import type { Host } from '@/types/tauri-types'

import { db } from '@/lib/db'
import { normalizeDeep } from '@/lib/normalize'
import { hosts } from '@/lib/schema'
import { asc, eq } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export interface HostSelectItem {
	id: number
	label: string
	username: string
	enabled: boolean
}

export const useHostById = defineColadaLoader('dashboard-hosts-id-edit', {
	key: to => ['hosts', `host-${to.params.id}`],
	query: async to =>
		db
			.select()
			.from(hosts)
			.where(eq(hosts.id, Number.parseInt(to.params.id)))
			.limit(1)
			.then(data => normalizeDeep(data)[0] as unknown as Host)
			.catch(() => undefined),
})

export const useHostListAll = defineColadaLoader('dashboard-hosts', {
	key: () => ['hosts', 'all'],
	query: async () =>
		await db
			.select()
			.from(hosts)
			.orderBy(asc(hosts.name))
			.then(data => normalizeDeep(data) as unknown as Host[])
			.catch(() => [] as Host[]),
})

export const useHostSelectPopulate = defineColadaLoader({
	key: () => ['hosts', 'select', 'populate'],
	query: async () =>
		await db
			.select({
				id: hosts.id,
				label: hosts.name,
				username: hosts.username,
				enabled: hosts.enabled,
			})
			.from(hosts)
			.orderBy(asc(hosts.name))
			.then(data => normalizeDeep(data) as unknown as HostSelectItem[])
			.catch(() => [] as HostSelectItem[]),
})
