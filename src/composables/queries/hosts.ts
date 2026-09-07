import type { Host } from '@/types/entities'

import { useQueryCache } from '@pinia/colada'
import { eq } from 'drizzle-orm'

import { createQueryNotifier, firstRow, invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { db } from '@/drizzle/drizzle'
import { hosts as deployer_hosts } from '@/drizzle/schema'
import { i18n } from '@/i18n'

export function useHostQuery() {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	async function findAll(): Promise<Host[]> {
		return db.query.hosts.findMany().catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return []
		})
	}

	async function find(id: number): Promise<Host | undefined> {
		return await db.query.hosts.findFirst({ where: { id } }).catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return undefined
		})
	}

	async function create(data: Omit<Host, 'id'>): Promise<Host | undefined> {
		const notice = notify.loading(
			t('notifications.hosts.create.loading.title'),
			t('notifications.hosts.create.loading.description'),
		)

		data.created_at = new Date().toISOString()
		data.updated_at = new Date().toISOString()

		data.system_info = {
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
		}
		data.status_info = {
			cpu_usage: '',
			ram_usage: '',
			disk_usage: '',
			last_checked_at: null,
		}
		data.server_updates = {
			packages: [],
			summary: { total: 0, security: 0, major: 0, minor: 0, patch: 0 },
			last_checked_at: null,
		}

		return await db
			.insert(deployer_hosts)
			.values(data as any)
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['hosts'])

				notify.success(
					notice.id,
					t('notifications.hosts.create.success.title'),
					t('notifications.hosts.create.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.hosts.create.error.title'),
						description: t('notifications.hosts.create.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)

				return undefined
			})
	}

	async function update(id: number, data: Partial<Omit<Host, 'id' | 'created_at'>>): Promise<Host | undefined> {
		const notice = notify.loading(
			t('notifications.hosts.update.loading.title'),
			t('notifications.hosts.update.loading.description'),
		)

		data.updated_at = new Date().toISOString()

		return await db
			.update(deployer_hosts)
			.set(data)
			.where(eq(deployer_hosts.id, id))
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['hosts'])

				notify.success(
					notice.id,
					t('notifications.hosts.update.success.title'),
					t('notifications.hosts.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.hosts.update.error.title'),
						description: t('notifications.hosts.update.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		// Pre-check fuera del flujo de notificación: el loading necesita {name}
		const found = await db.query.hosts.findFirst({ where: { id } }).catch((e): Host | undefined => {
			notify.fail(e, { title: t('notifications.hosts.delete.error.title') })
			return undefined
		})

		if (!found) {
			return false
		}

		const notice = notify.loading(
			t('notifications.hosts.delete.loading.title'),
			t('notifications.hosts.delete.loading.description', { name: found.name }),
		)

		return await db
			.delete(deployer_hosts)
			.where(eq(deployer_hosts.id, id))
			.then(async () => {
				await invalidateCacheQueries(cacheQuery, ['hosts'])

				notify.success(
					notice.id,
					t('notifications.hosts.delete.success.title'),
					t('notifications.hosts.delete.success.description', { name: found.name }),
				)

				return true
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.hosts.delete.error.title'),
						description: t('notifications.hosts.delete.error.description', { name: found.name, details: e }),
					},
					notice.id,
				)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
