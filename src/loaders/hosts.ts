import { db } from '@/drizzle/drizzle'
import { hosts } from '@/drizzle/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export interface HostSelectItem {
	id: number
	label: string
	username: string
	enabled: boolean
}

export const useHostById = defineColadaLoader('dashboard-hosts-id', {
	key: to => ['hosts', `host-${to.params.id}`],
	query: async to =>
		await db
			.select()
			.from(hosts)
			.where(and(eq(hosts.id, Number.parseInt(to.params.id)), isNull(hosts.deleted_at)))
			.limit(1)
			.then(data => data[0])
			.catch(() => undefined),
})

export const useHostListAll = defineColadaLoader('dashboard-hosts', {
	key: ['hosts', 'all'],
	query: async () =>
		await db
			.select()
			.from(hosts)
			.where(isNull(hosts.deleted_at))
			.then(data => data)
			.catch(() => []),
})

export const useHostSelectPopulate = defineColadaLoader({
	key: ['hosts', 'select', 'populate'],
	query: async () =>
		await db
			.select({
				id: hosts.id,
				label: hosts.name,
				username: hosts.username,
				enabled: hosts.enabled,
			})
			.from(hosts)
			.where(isNull(hosts.deleted_at))
			.orderBy(asc(hosts.name))
			.then(data => data as unknown as HostSelectItem[])
			.catch(() => [] as HostSelectItem[]),
})
