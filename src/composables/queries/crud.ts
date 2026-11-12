import type { SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

import { useQueryCache } from '@pinia/colada'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'

import {
	createQueryNotifier,
	firstRow,
	invalidateCacheQueries,
	nowIso,
	readErrorFallback,
	withTimestamps,
} from '@/composables/queries/shared'
import type {
	CrudApi,
	CrudConfig,
	CrudListOptions,
	CrudMutationContext,
	CrudRow,
} from '@/composables/queries/shared.interfaces'
import useToaster from '@/composables/useToaster'
import { db } from '@/drizzle/drizzle'
import { i18n } from '@/i18n'

// ====================================================================
// Factoría
// ====================================================================

/**
 * Crea un composable CRUD (`findAll`/`find`/`create`/`update`/`remove`/`restore`)
 * a partir de la configuración de una entidad.
 *
 * Centraliza el ciclo común a todas las queries Drizzle:
 *
 * 1. Notificación persistente de la operación.
 * 2. Ejecución de la sentencia (a través del proxy de `query_raw`).
 * 3. Invalidación de la caché de Pinia Colada (`cacheKey`).
 * 4. Notificación de éxito o error.
 *
 * Las claves i18n se generan por convención:
 * `<i18nPrefix>.{create|update|delete|restore}.{loading|success|error}.{title|description}`.
 *
 * **Importante:** `returning()` no pasa por el enmascarado del proxy. Si la
 * entidad tiene campos `encryptedText(...)`, no se debe consumir su valor a
 * partir de la fila devuelta por `create`/`update`.
 */
export function createCrudQuery<TTable extends SQLiteTable, TKey extends string | number, TCreate, TUpdate>(
	config: CrudConfig<TTable, TCreate, TUpdate>,
): CrudApi<TTable, TKey, TCreate, TUpdate> {
	const cacheQuery = useQueryCache()
	const toaster = useToaster()
	// Composer global: seguro fuera de setup (loaders, invalidateQueries)
	const { t } = i18n.global
	const notify = createQueryNotifier({ toaster, t })

	const { table, softDelete } = config
	const prefix = config.i18nPrefix

	const activeWhere = softDelete ? isNull(softDelete.deletedAt) : undefined
	const deletedWhere = softDelete ? isNotNull(softDelete.deletedAt) : undefined

	function invalidate(): Promise<void> {
		return invalidateCacheQueries(cacheQuery, [config.cacheKey])
	}

	function nameOfInput(data: unknown): string {
		const name = (data as { name?: unknown } | undefined)?.name

		return typeof name === 'string' ? name : ''
	}

	function updatedAtSet(now: string): Record<string, unknown> {
		return softDelete?.updatedAt ? { [softDelete.updatedAt.name]: now } : {}
	}

	function listWhere(options: CrudListOptions): SQL | undefined {
		if (!softDelete) return config.listWhere
		if (options.onlyDeleted) return and(config.listWhere, deletedWhere)
		if (options.includeDeleted) return config.listWhere

		return and(config.listWhere, activeWhere)
	}

	async function findAll(options: CrudListOptions = {}): Promise<CrudRow<TTable>[]> {
		// Sin soft-delete no existe "papelera": no hay nada que listar.
		if (options.onlyDeleted && !softDelete) return []

		const base = db.select().from(table).where(listWhere(options))
		const query = config.listOrderBy?.length ? base.orderBy(...config.listOrderBy) : base

		return await Promise.resolve(query)
			.then(rows => rows as unknown as CrudRow<TTable>[])
			.catch(e => {
				notify.fail(e, readErrorFallback(t))
				return []
			})
	}

	/**
	 * Busca por clave aplicando (o no) el filtro de soft-delete.
	 * `deleted` = `true` busca solo filas eliminadas (para `restore`).
	 */
	async function findByKey(key: TKey, deleted = false): Promise<CrudRow<TTable> | undefined> {
		const where = and(eq(config.primaryKey, key), config.listWhere, deleted ? deletedWhere : activeWhere)

		return await Promise.resolve(db.select().from(table).where(where).limit(1))
			.then(rows => firstRow(rows as unknown as CrudRow<TTable>[]))
			.catch(e => {
				notify.fail(e, readErrorFallback(t))
				return undefined
			})
	}

	async function find(key: TKey): Promise<CrudRow<TTable> | undefined> {
		return await findByKey(key)
	}

	async function create(data: TCreate): Promise<CrudRow<TTable> | undefined> {
		const loadingKey = config.createLoadingKey ?? `${prefix}.create.loading`
		const notice = notify.loading(t(`${loadingKey}.title`), t(`${loadingKey}.description`))
		const ctx: CrudMutationContext = { notify, toaster, noticeId: notice.id, t }

		try {
			const values = config.toInsert ? await config.toInsert(data, ctx) : withTimestamps(data as object)
			const rows = await db
				.insert(table)
				.values(values as never)
				.returning()
			const row = firstRow(rows as unknown as CrudRow<TTable>[])

			if (!row) return undefined

			await invalidate()
			notify.success(
				notice.id,
				t(`${prefix}.create.success.title`),
				t(`${prefix}.create.success.description`, {
					id: (row as Record<string, unknown>).id,
					name: config.nameOf(row),
				}),
			)

			return row
		} catch (e) {
			notify.fail(
				e,
				{
					title: t(`${prefix}.create.error.title`),
					description: t(`${prefix}.create.error.description`, { name: nameOfInput(data), details: e }),
				},
				notice.id,
			)

			return undefined
		}
	}

	async function update(key: TKey, data: TUpdate): Promise<CrudRow<TTable> | undefined> {
		const notice = notify.loading(t(`${prefix}.update.loading.title`), t(`${prefix}.update.loading.description`))
		const current = await find(key)

		if (!current) {
			notify.fail(new Error('crud_not_found'), { title: t(`${prefix}.update.error.title`) }, notice.id)
			return undefined
		}

		try {
			const payload = config.toUpdate
				? await config.toUpdate(current, data)
				: { ...(data as object), updated_at: nowIso() }
			const rows = await db
				.update(table)
				.set(payload as never)
				.where(eq(config.primaryKey, key))
				.returning()
			const row = firstRow(rows as unknown as CrudRow<TTable>[])

			if (!row) return undefined

			await invalidate()
			notify.success(
				notice.id,
				t(`${prefix}.update.success.title`),
				t(`${prefix}.update.success.description`, { name: config.nameOf(row) }),
			)

			return row
		} catch (e) {
			notify.fail(
				e,
				{
					title: t(`${prefix}.update.error.title`),
					description: t(`${prefix}.update.error.description`, {
						name: nameOfInput(data) || config.nameOf(current),
						details: e,
					}),
				},
				notice.id,
			)

			return undefined
		}
	}

	async function remove(key: TKey): Promise<boolean> {
		const current = await find(key)
		if (!current) return false

		const name = config.nameOf(current)
		const notice = notify.loading(
			t(`${prefix}.delete.loading.title`),
			t(`${prefix}.delete.loading.description`, { name }),
		)

		try {
			if (softDelete) {
				const now = nowIso()

				await db
					.update(table)
					.set({ [softDelete.deletedAt.name]: now, ...updatedAtSet(now) } as never)
					.where(eq(config.primaryKey, key))
			} else {
				await db.delete(table).where(eq(config.primaryKey, key))
			}

			await invalidate()
			notify.success(
				notice.id,
				t(`${prefix}.delete.success.title`),
				t(`${prefix}.delete.success.description`, { name }),
			)

			return true
		} catch (e) {
			notify.fail(
				e,
				{
					title: t(`${prefix}.delete.error.title`),
					description: t(`${prefix}.delete.error.description`, { name, details: e }),
				},
				notice.id,
			)

			return false
		}
	}

	async function restore(key: TKey): Promise<boolean> {
		if (!softDelete) return false

		const current = await findByKey(key, true)
		if (!current) return false

		const name = config.nameOf(current)
		const notice = notify.loading(
			t(`${prefix}.restore.loading.title`),
			t(`${prefix}.restore.loading.description`, { name }),
		)

		try {
			await db
				.update(table)
				.set({ [softDelete.deletedAt.name]: null, ...updatedAtSet(nowIso()) } as never)
				.where(eq(config.primaryKey, key))

			await invalidate()
			notify.success(
				notice.id,
				t(`${prefix}.restore.success.title`),
				t(`${prefix}.restore.success.description`, { name }),
			)

			return true
		} catch (e) {
			notify.fail(
				e,
				{
					title: t(`${prefix}.restore.error.title`),
					description: t(`${prefix}.restore.error.description`, { name, details: e }),
				},
				notice.id,
			)

			return false
		}
	}

	return {
		findAll,
		find,
		create,
		update,
		remove,
		restore,
		supportsSoftDelete: Boolean(softDelete),
	}
}
