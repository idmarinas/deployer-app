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
	CrudPurgeAllResult,
	CrudReference,
	CrudReferenceMatch,
	CrudRemoveOptions,
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
 * `<i18nPrefix>.{create|update|delete|purge|purgeAll|restore}.{loading|success|error}.{title|description}`.
 *
 * **Importante:** `returning()` no pasa por el enmascarado del proxy. Si la
 * entidad tiene campos `encryptedText(...)`, no se debe consumir su valor a
 * partir de la fila devuelta por `create`/`update`; aquí solo se usa la clave.
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
	const references: CrudReference[] = config.references ?? []

	const activeWhere = softDelete ? isNull(softDelete.deletedAt) : undefined
	const deletedWhere = softDelete ? isNotNull(softDelete.deletedAt) : undefined

	function invalidate(): Promise<void> {
		return invalidateCacheQueries(cacheQuery, [config.cacheKey])
	}

	/** Invalida también las cachés de las entidades desvinculadas. */
	async function invalidateReferences(): Promise<void> {
		const keys = new Set(references.map(reference => reference.cacheKey).filter((key): key is string => Boolean(key)))

		await Promise.all([...keys].map(key => invalidateCacheQueries(cacheQuery, [key])))
	}

	function nameOfInput(data: unknown): string {
		const name = (data as { name?: unknown } | undefined)?.name

		return typeof name === 'string' ? name : ''
	}

	function updatedAtSet(now: string): Record<string, unknown> {
		return softDelete?.updatedAt ? { [softDelete.updatedAt.name]: now } : {}
	}

	function keyOf(row: CrudRow<TTable>): TKey {
		return (row as Record<string, unknown>)[config.primaryKey.name] as TKey
	}

	/** Las filas con `internal = true` no se borran ni se purgan. */
	function isInternal(row: CrudRow<TTable>): boolean {
		return Boolean((row as Record<string, unknown>).internal)
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
	 * `onlyDeleted` busca solo filas eliminadas; `includeDeleted` no filtra.
	 * Sustituye a la antigua `findByKey()` privada.
	 */
	async function find(key: TKey, options: CrudListOptions = {}): Promise<CrudRow<TTable> | undefined> {
		const where = and(eq(config.primaryKey, key), listWhere(options))

		return await Promise.resolve(db.select().from(table).where(where).limit(1))
			.then(rows => firstRow(rows as unknown as CrudRow<TTable>[]))
			.catch(e => {
				notify.fail(e, readErrorFallback(t))
				return undefined
			})
	}

	/** Filas de otras entidades que apuntan a `key`, agrupadas por entidad. */
	async function findReferences(key: TKey): Promise<CrudReferenceMatch[]> {
		if (references.length === 0) return []

		const matches: CrudReferenceMatch[] = []

		for (const reference of references) {
			const rows = await Promise.resolve(db.select().from(reference.table).where(eq(reference.column, key)))
				.then(result => result as unknown as Record<string, unknown>[])
				.catch(e => {
					notify.fail(e, readErrorFallback(t))
					return []
				})

			if (rows.length === 0) continue

			matches.push({
				labelKey: reference.labelKey,
				rows: rows.map(row => ({
					id: (row.id ?? row.key ?? '') as number | string,
					name: String(row.name ?? row.title ?? row.id ?? row.key ?? ''),
				})),
			})
		}

		return matches
	}

	/** Pone a `NULL` las FK declaradas que apuntan a `key`. */
	async function unlinkReferences(key: TKey): Promise<void> {
		for (const reference of references) {
			await Promise.resolve(
				db
					.update(reference.table)
					.set({ [reference.column.name]: null } as never)
					.where(eq(reference.column, key)),
			)
		}

		await invalidateReferences()
	}

	/** Error de negocio con textos ya traducidos (referencias, filas internas). */
	function notifyBlocked(titleKey: string, descriptionKey: string, params: Record<string, unknown>): void {
		notify.fail(new Error(titleKey), {
			title: t(titleKey),
			description: t(descriptionKey, params),
		})
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
				.where(and(eq(config.primaryKey, key), activeWhere))
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

	/** `DELETE` físico con guarda de estado (solo filas en papelera). */
	async function purgeRow(key: TKey): Promise<boolean> {
		if (!softDelete) return false

		const rows = await Promise.resolve(
			db
				.delete(table)
				.where(and(eq(config.primaryKey, key), deletedWhere))
				.returning({ key: config.primaryKey }),
		)

		return rows.length > 0
	}

	async function remove(key: TKey, options: CrudRemoveOptions = {}): Promise<boolean> {
		const { purge = false, unlink = false } = options

		if (purge) {
			// La purga solo aplica a entidades con papelera y a filas ya borradas.
			if (!softDelete) return false

			const current = await find(key, { onlyDeleted: true })
			if (!current) return false

			const name = config.nameOf(current)

			if (isInternal(current)) {
				notifyBlocked(`${prefix}.purge.error.internal.title`, `${prefix}.purge.error.internal.description`, {
					name,
				})

				return false
			}

			const matches = await findReferences(key)

			if (matches.length > 0 && !unlink) {
				notifyBlocked(`${prefix}.purge.error.referenced.title`, `${prefix}.purge.error.referenced.description`, {
					name,
				})

				return false
			}

			const notice = notify.loading(
				t(`${prefix}.purge.loading.title`),
				t(`${prefix}.purge.loading.description`, { name }),
			)

			try {
				if (matches.length > 0) await unlinkReferences(key)

				const purged = await purgeRow(key)
				if (!purged) return false

				await invalidate()
				notify.success(
					notice.id,
					t(`${prefix}.purge.success.title`),
					t(`${prefix}.purge.success.description`, { name }),
				)

				return true
			} catch (e) {
				notify.fail(
					e,
					{
						title: t(`${prefix}.purge.error.title`),
						description: t(`${prefix}.purge.error.description`, { name, details: e }),
					},
					notice.id,
				)

				return false
			}
		}

		const current = await find(key)
		if (!current) return false

		const name = config.nameOf(current)

		if (isInternal(current)) {
			notifyBlocked(`${prefix}.delete.error.internal.title`, `${prefix}.delete.error.internal.description`, {
				name,
			})

			return false
		}

		const matches = await findReferences(key)

		if (matches.length > 0 && !unlink) {
			notifyBlocked(`${prefix}.delete.error.referenced.title`, `${prefix}.delete.error.referenced.description`, {
				name,
			})

			return false
		}

		const notice = notify.loading(
			t(`${prefix}.delete.loading.title`),
			t(`${prefix}.delete.loading.description`, { name }),
		)

		try {
			if (matches.length > 0) await unlinkReferences(key)

			if (softDelete) {
				const now = nowIso()
				const rows = await Promise.resolve(
					db
						.update(table)
						.set({ [softDelete.deletedAt.name]: now, ...updatedAtSet(now) } as never)
						.where(and(eq(config.primaryKey, key), activeWhere))
						.returning({ key: config.primaryKey }),
				)

				if (rows.length === 0) return false

				await invalidate()
				notify.success(
					notice.id,
					t(`${prefix}.delete.success.title`),
					t(`${prefix}.delete.success.description`, { name }),
					{
						duration: 8000,
						actions: [
							{
								label: t('common.actions.undo'),
								onClick: () => {
									void restore(key)
								},
							},
						],
					},
				)
			} else {
				const rows = await Promise.resolve(
					db.delete(table).where(eq(config.primaryKey, key)).returning({ key: config.primaryKey }),
				)

				if (rows.length === 0) return false

				await invalidate()
				notify.success(
					notice.id,
					t(`${prefix}.delete.success.title`),
					t(`${prefix}.delete.success.description`, { name }),
				)
			}

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

		const current = await find(key, { onlyDeleted: true })
		if (!current) return false

		const name = config.nameOf(current)
		const notice = notify.loading(
			t(`${prefix}.restore.loading.title`),
			t(`${prefix}.restore.loading.description`, { name }),
		)

		try {
			const rows = await Promise.resolve(
				db
					.update(table)
					.set({ [softDelete.deletedAt.name]: null, ...updatedAtSet(nowIso()) } as never)
					.where(and(eq(config.primaryKey, key), deletedWhere))
					.returning({ key: config.primaryKey }),
			)

			if (rows.length === 0) return false

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

	/**
	 * Vacía la papelera de la tabla.
	 *
	 * El proxy no expone transacciones: la purga es secuencial y un fallo en una
	 * fila no revierte las anteriores. Las filas con referencias (o `internal`)
	 * se dejan en papelera y se cuentan como `blocked`.
	 */
	async function purgeDeleted(): Promise<CrudPurgeAllResult> {
		const result: CrudPurgeAllResult = { purged: 0, blocked: 0 }

		if (!softDelete) return result

		const rows = await findAll({ onlyDeleted: true })
		if (rows.length === 0) return result

		const notice = notify.loading(t(`${prefix}.purgeAll.loading.title`), t(`${prefix}.purgeAll.loading.description`))

		try {
			for (const row of rows) {
				if (isInternal(row)) {
					result.blocked++
					continue
				}

				const key = keyOf(row)
				const matches = await findReferences(key)

				if (matches.length > 0) {
					result.blocked++
					continue
				}

				if (await purgeRow(key)) result.purged++
			}

			await invalidate()
			notify.success(
				notice.id,
				t(`${prefix}.purgeAll.success.title`),
				t(`${prefix}.purgeAll.success.description`, {
					purged: result.purged,
					blocked: result.blocked,
				}),
			)

			if (result.blocked > 0) {
				toaster.warning(
					t(`${prefix}.purgeAll.warning.title`),
					t(`${prefix}.purgeAll.warning.description`, { blocked: result.blocked }),
				)
			}

			return result
		} catch (e) {
			notify.fail(
				e,
				{
					title: t(`${prefix}.purgeAll.error.title`),
					description: t(`${prefix}.purgeAll.error.description`, {
						purged: result.purged,
						blocked: result.blocked,
						details: e,
					}),
				},
				notice.id,
			)

			return result
		}
	}

	return {
		findAll,
		find,
		create,
		update,
		remove,
		restore,
		purgeDeleted,
		findReferences,
		supportsSoftDelete: Boolean(softDelete),
	}
}
