import type { Command } from '@/types/entities'

import { useQueryCache } from '@pinia/colada'
import { and, desc, eq, isNull } from 'drizzle-orm'

import { createQueryNotifier, firstRow, invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { db } from '@/drizzle/drizzle'
import { commands as deployer_commands } from '@/drizzle/schema'
import { i18n } from '@/i18n'

export function useCommandQuery() {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	async function findAll(): Promise<Command[]> {
		return db
			.select()
			.from(deployer_commands)
			.where(isNull(deployer_commands.deleted_at))
			.orderBy(desc(deployer_commands.created_at))
			.catch(e => {
				notify.fail(e, {
					title: t('overlays.toast.title.error'),
					description: t('overlays.toast.description.error'),
				})
				return []
			})
	}

	async function find(key: string): Promise<Command | undefined> {
		return db
			.select()
			.from(deployer_commands)
			.where(and(eq(deployer_commands.key, key), isNull(deployer_commands.deleted_at)))
			.limit(1)
			.then(rows => firstRow(rows))
			.catch(e => {
				notify.fail(e, {
					title: t('overlays.toast.title.error'),
					description: t('overlays.toast.description.error'),
				})
				return undefined
			})
	}

	async function create(data: Omit<Command, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Command | undefined> {
		const notice = notify.loading(
			t('notifications.commands.create.loading.title'),
			t('notifications.commands.create.loading.description'),
		)

		const enriched = {
			...data,
			updated_at: new Date().toISOString(),
			created_at: new Date().toISOString(),
		}

		return await db
			.insert(deployer_commands)
			.values(enriched as any)
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['commands'])

				notify.success(
					notice.id,
					t('notifications.commands.create.success.title'),
					t('notifications.commands.create.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.commands.create.error.title'),
						description: t('notifications.commands.create.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)

				return undefined
			})
	}

	async function update(key: string, data: Partial<Omit<Command, 'key' | 'created_at'>>): Promise<Command | undefined> {
		const notice = notify.loading(
			t('notifications.commands.update.loading.title'),
			t('notifications.commands.update.loading.description'),
		)

		data.updated_at = new Date().toISOString()

		return await db
			.update(deployer_commands)
			.set(data)
			.where(eq(deployer_commands.key, key))
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['commands'])

				notify.success(
					notice.id,
					t('notifications.commands.update.success.title'),
					t('notifications.commands.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.commands.update.error.title'),
						description: t('notifications.commands.update.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)
				return undefined
			})
	}

	async function remove(key: string): Promise<boolean> {
		// Pre-check fuera del flujo de notificación: el loading necesita {name}
		const found = await db
			.select()
			.from(deployer_commands)
			.where(and(eq(deployer_commands.key, key), isNull(deployer_commands.deleted_at)))
			.limit(1)
			.then(rows => firstRow(rows))
			.catch((e): Command | undefined => {
				notify.fail(e, { title: t('notifications.commands.delete.error.title') })
				return undefined
			})

		if (!found) {
			return false
		}

		const notice = notify.loading(
			t('notifications.commands.delete.loading.title'),
			t('notifications.commands.delete.loading.description', { name: found.name }),
		)

		return await db
			.update(deployer_commands)
			.set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
			.where(eq(deployer_commands.key, key))
			.then(async () => {
				await invalidateCacheQueries(cacheQuery, ['commands'])

				notify.success(
					notice.id,
					t('notifications.commands.delete.success.title'),
					t('notifications.commands.delete.success.description', { name: found.name }),
				)

				return true
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.commands.delete.error.title'),
						description: t('notifications.commands.delete.error.description', { name: found.name, details: e }),
					},
					notice.id,
				)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
