import type { Variable } from '@/types/entities'

import { useQueryCache } from '@pinia/colada'
import { eq } from 'drizzle-orm'

import { createQueryNotifier, firstRow, invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { db } from '@/drizzle/drizzle'
import { variables } from '@/drizzle/schema'
import { i18n } from '@/i18n'

export function useVariableQuery() {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	async function findAll(): Promise<Variable[]> {
		return await db.query.variables.findMany().catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})

			return []
		})
	}

	async function find(id: number): Promise<Variable | undefined> {
		return await db.query.variables.findFirst({ where: { id } }).catch(e => {
			notify.fail(e, {
				title: t('overlays.toast.title.error'),
				description: t('overlays.toast.description.error'),
			})

			return undefined
		})
	}

	async function create(data: Omit<Variable, 'id'>): Promise<Variable | undefined> {
		const notice = notify.loading(
			t('notifications.variables.create.loading.title'),
			t('notifications.variables.create.loading.description'),
		)

		const enriched = {
			...data,
			updated_at: new Date().toISOString(),
			created_at: new Date().toISOString(),
		}
		return await db
			.insert(variables)
			.values(enriched)
			// `returning()` no pasa por el enmascarado del proxy: si la variable es
			// secreta, `value` vuelve como token `ENC:`. No consumir ese campo.
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['variables'])

				notify.success(
					notice.id,
					t('notifications.variables.create.success.title'),
					t('notifications.variables.create.success.description', { id: row.id, name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.variables.create.error.title'),
						description: t('notifications.variables.create.error.description', { name: enriched.name, details: e }),
					},
					notice.id,
				)

				return undefined
			})
	}

	async function update(id: number, data: Partial<Omit<Variable, 'created_at'>>): Promise<Variable | undefined> {
		const notice = notify.loading(
			t('notifications.variables.update.loading.title'),
			t('notifications.variables.update.loading.description'),
		)

		const current = await find(id)

		if (current?.is_secret) {
			data.is_secret = true
		}

		data.updated_at = new Date().toISOString()

		return await db
			.update(variables)
			.set(data)
			.where(eq(variables.id, id))
			// `returning()` no pasa por el enmascarado del proxy: si la variable es
			// secreta, `value` vuelve como token `ENC:`. No consumir ese campo.
			.returning()
			.then(async rows => {
				const row = firstRow(rows)
				if (!row) return undefined

				await invalidateCacheQueries(cacheQuery, ['variables'])

				notify.success(
					notice.id,
					t('notifications.variables.update.success.title'),
					t('notifications.variables.update.success.description', { name: row.name }),
				)

				return row
			})
			.catch(e => {
				notify.fail(
					e,
					{
						title: t('notifications.variables.update.error.title'),
						description: t('notifications.variables.update.error.description', { name: data.name, details: e }),
					},
					notice.id,
				)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		const notice = notify.loading(
			t('notifications.variables.delete.loading.title'),
			t('notifications.variables.delete.loading.description'),
		)

		return await db.query.variables
			.findFirst({ where: { id } })
			.then(async row => {
				if (!row) {
					return false
				}

				return await db
					.delete(variables)
					.where(eq(variables.id, id))
					.then(async () => {
						await invalidateCacheQueries(cacheQuery, ['variables'])

						notify.success(
							notice.id,
							t('notifications.variables.delete.success.title'),
							t('notifications.variables.delete.success.description', { name: row.name }),
						)

						return true
					})
					.catch(e => {
						notify.fail(
							e,
							{
								title: t('notifications.variables.delete.error.title'),
								description: t('notifications.variables.delete.error.description', { name: row.name, details: e }),
							},
							notice.id,
						)
						return false
					})
			})
			.catch(e => {
				// Igual que el original: este catch (findFirst vía API relacional) no pasa por toQueryRawError
				toaster.update(
					notice.id,
					'error',
					t('notifications.variables.delete.error.title'),
					t('notifications.variables.delete.error.description', { details: e }),
				)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
