import type { DockerCompose } from '@/types/tauri-types'

import { useQueryCache } from '@pinia/colada'
import { eq } from 'drizzle-orm'

import { createQueryNotifier, firstRow, invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { i18n } from '@/i18n'
import { db } from '@/lib/db'
import { projects_docker_compose as deployer_docker_composes } from '@/lib/schema'

export function useDockerComposeQuery() {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	async function findAll(): Promise<DockerCompose[]> {
		return db.query.projects_docker_compose.findMany().catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return []
		})
	}

	async function find(id: number): Promise<DockerCompose | undefined> {
		return await db.query.projects_docker_compose.findFirst({ where: { id } }).catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})
			return undefined
		})
	}

	async function create(data: Omit<DockerCompose, 'id'>): Promise<DockerCompose | undefined> {
		const notice = notify.loading(
			t('notifications.docker_composes.create.loading.title'),
			t('notifications.docker_composes.create.loading.description'),
		)

		data.created_at = new Date().toISOString()
		data.updated_at = new Date().toISOString()

		return await db
			.insert(deployer_docker_composes)
			.values(data as any)
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['docker_composes'])

				notify.success(
					notice.id,
					t('notifications.docker_composes.create.success.title'),
					t('notifications.docker_composes.create.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.docker_composes.create.error.title'),
						description: t('notifications.docker_composes.create.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)

				return undefined
			})
	}

	async function update(
		id: number,
		data: Partial<Omit<DockerCompose, 'id' | 'created_at'>>,
	): Promise<DockerCompose | undefined> {
		const notice = notify.loading(
			t('notifications.docker_composes.update.loading.title'),
			t('notifications.docker_composes.update.loading.description'),
		)

		data.updated_at = new Date().toISOString()

		return await db
			.update(deployer_docker_composes)
			.set(data)
			.where(eq(deployer_docker_composes.id, id))
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['docker_composes'])

				notify.success(
					notice.id,
					t('notifications.docker_composes.update.success.title'),
					t('notifications.docker_composes.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.docker_composes.update.error.title'),
						description: t('notifications.docker_composes.update.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		// Pre-check fuera del flujo de notificación: el loading necesita {name}
		const found = await db.query.projects_docker_compose
			.findFirst({ where: { id } })
			.catch((e): DockerCompose | undefined => {
				notify.fail(e, { title: t('notifications.docker_composes.delete.error.title') })
				return undefined
			})

		if (!found) {
			return false
		}

		const notice = notify.loading(
			t('notifications.docker_composes.delete.loading.title'),
			t('notifications.docker_composes.delete.loading.description', { name: found.name }),
		)

		return await db
			.delete(deployer_docker_composes)
			.where(eq(deployer_docker_composes.id, id))
			.then(async () => {
				await invalidateCacheQueries(cacheQuery, ['docker_composes'])

				notify.success(
					notice.id,
					t('notifications.docker_composes.delete.success.title'),
					t('notifications.docker_composes.delete.success.description', { name: found.name }),
				)

				return true
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.docker_composes.delete.error.title'),
						description: t('notifications.docker_composes.delete.error.description', { name: found.name, details: e }),
					},
					notice.id,
				)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
