import type { Host } from '@/types/entities'

import { createCrudQuery } from '@/composables/queries/crud'
import { withTimestamps } from '@/composables/queries/shared'
import { hosts as deployer_hosts } from '@/drizzle/schema'

/**
 * CRUD de hosts.
 *
 * Al crear, inicializa los bloques JSON que el backend espera (`system_info`,
 * `status_info`, `server_updates`) para que el host pueda testearse y
 * actualizarse desde el primer momento.
 */
export function useHostQuery() {
	return createCrudQuery<typeof deployer_hosts, number, Omit<Host, 'id'>, Partial<Omit<Host, 'id' | 'created_at'>>>({
		table: deployer_hosts,
		primaryKey: deployer_hosts.id,
		cacheKey: 'hosts',
		i18nPrefix: 'notifications.hosts',
		nameOf: row => row.name,
		toInsert: data => ({
			...withTimestamps(data),
			system_info: {
				package_manager: '',
				package_manager_version: '',
				kernel: '',
				arch: '',
				distribution: '',
				cpu_cores: '',
				memory_total: '',
				disk_total: '',
				os_release: '',
				last_checked_at: null,
			},
			status_info: {
				cpu_usage: '',
				ram_usage: '',
				disk_usage: '',
				last_checked_at: null,
			},
			server_updates: {
				packages: [],
				summary: { total: 0, security: 0, major: 0, minor: 0, patch: 0, packaging: 0 },
				last_checked_at: null,
			},
		}),
		softDelete: {
			deletedAt: deployer_hosts.deleted_at,
			updatedAt: deployer_hosts.updated_at,
		},
	})
}
