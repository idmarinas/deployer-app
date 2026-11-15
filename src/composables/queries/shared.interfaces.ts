import type { Toast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { AnyColumn, InferSelectModel, SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { Composer } from 'vue-i18n'

import useToaster from '@/composables/useToaster'

// ====================================================================
// Errores estructurados de las operaciones CRUD
// ====================================================================

export type QueryOperation =
	| 'findAll'
	| 'find'
	| 'create'
	| 'update'
	| 'remove'
	| 'restore'
	| 'purge'
	| 'purgeAll'
	| 'findReferences'

export interface QueryErrorInfo {
	/** Operación CRUD que falló. */
	operation: QueryOperation
	/** Clave i18n devuelta por el backend (`CommandResponse.message_key`), si la hubo. */
	message_key?: string
	/** Parámetros de interpolación para `message_key`. */
	message_params?: Record<string, string>
	/** Error original, para logging o depuración. */
	raw: unknown
}

// ====================================================================
// Notificaciones del ciclo de vida CRUD (toast persistente)
// ====================================================================

/** Textos ya traducidos, usados cuando el error capturado no es un `QueryRawError`. */
export interface ErrorFallback {
	title: string
	description?: string
}

export interface QueryNotifierDeps {
	toaster: ReturnType<typeof useToaster>
	t: Composer['t']
}

/** Opciones aceptadas por `useToaster` (`Partial<Omit<Toast, 'title' | 'description'>>`). */
export type ToasterOptions = Partial<Omit<Toast, 'title' | 'description'>>

/**
 * Contrato de `createQueryNotifier` (`src/composables/queries/shared.ts`).
 *
 * Se declara aquí (y no como `ReturnType`) para que los tipos CRUD puedan
 * referenciarlo sin crear un ciclo de importación con `shared.ts`.
 */
export interface QueryNotifier {
	/** Aviso persistente (sin autodismiss) mientras dura la operación. */
	loading: (title: string, description?: string) => Toast
	/** Cambia el aviso persistente a la siguiente fase (mismo toast). */
	phase: (noticeId: string | number, title: string, description?: string) => void
	/** Cierra el ciclo con éxito. `options` permite añadir acciones (p. ej. Deshacer). */
	success: (noticeId: string | number, title: string, description?: string, options?: ToasterOptions) => void
	/** Muestra un error estructurado o los textos de fallback. */
	fail: (e: unknown, fallback: ErrorFallback, noticeId?: string | number) => void
}

// ====================================================================
// Factoría CRUD (`src/composables/queries/crud.ts`)
// ====================================================================

/** Fila tal como la devuelve un `SELECT` de la tabla. */
export type CrudRow<TTable extends SQLiteTable> = InferSelectModel<TTable>

/** Valores aceptados por un `INSERT` (permite campos con default). */
export type CrudInsert<TTable extends SQLiteTable> = Partial<CrudRow<TTable>> & Record<string, unknown>

/** Opciones del listado para entidades con soft-delete. */
export interface CrudListOptions {
	/** Incluye también las filas marcadas como eliminadas. */
	includeDeleted?: boolean
	/** Devuelve únicamente las filas eliminadas (papelera). */
	onlyDeleted?: boolean
}

/**
 * Contexto que reciben los hooks de mutación (`toInsert`, `toUpdate`).
 * Permite reutilizar el toast persistente de la operación (fases, errores
 * estructurados, etc.).
 */
export interface CrudMutationContext extends QueryNotifierDeps {
	notify: QueryNotifier
	noticeId: Toast['id']
}

/** Configuración del soft-delete de una entidad. */
export interface CrudSoftDelete {
	/** Columna `deleted_at` (NULL = fila activa). */
	deletedAt: AnyColumn
	/** Columna `updated_at`; si se indica, se actualiza junto con `deleted_at`. */
	updatedAt?: AnyColumn
}

/**
 * Referencia entrante declarada por una entidad.
 *
 * `remove()` comprueba estas referencias antes de borrar y solo desvincula
 * (pone la FK a `NULL`) con `{ unlink: true }`.
 */
export interface CrudReference {
	/** Tabla que contiene la clave foránea. */
	table: SQLiteTable
	/** Columna de la tabla que apunta a la entidad. */
	column: AnyColumn
	/** Clave i18n del nombre legible de la entidad referenciante. */
	labelKey: string
	/** Prefijo de caché de la entidad referenciante (se invalida al desvincular). */
	cacheKey?: string
}

/** Fila que referencia a la entidad. */
export interface CrudReferenceRow {
	id: number | string
	name: string
}

/** Referencias agrupadas por entidad para el diálogo de borrado. */
export interface CrudReferenceMatch {
	/** Clave i18n del nombre legible de la entidad referenciante. */
	labelKey: string
	/** Filas que apuntan a la entidad. */
	rows: CrudReferenceRow[]
}

/** Opciones de `remove()`. */
export interface CrudRemoveOptions {
	/** `true` = borrado físico; solo permitido si la fila ya está en la papelera. */
	purge?: boolean
	/** Desvincula las referencias declaradas antes de borrar. */
	unlink?: boolean
}

/** Resultado de `purgeDeleted()`. */
export interface CrudPurgeAllResult {
	/** Filas borradas físicamente. */
	purged: number
	/** Filas que no se purgaron por tener referencias entrantes o ser `internal`. */
	blocked: number
}

export interface CrudConfig<TTable extends SQLiteTable, TCreate, TUpdate> {
	/** Tabla Drizzle sobre la que opera la factoría. */
	table: TTable
	/** Columna primaria (`id`, `key`, ...) usada en `WHERE` y para leer el nombre. */
	primaryKey: AnyColumn
	/** Prefijo de la clave de caché de Pinia Colada (`variables`, `hosts`, ...). */
	cacheKey: string
	/** Prefijo i18n de las notificaciones (`notifications.variables`, ...). */
	i18nPrefix: string
	/** Texto de la fila que aparece en los toasts (normalmente `row.name`). */
	nameOf: (row: CrudRow<TTable>) => string
	/** Filtro extra del listado. El soft-delete se configura aparte en `softDelete`. */
	listWhere?: SQL
	/** Orden del listado. */
	listOrderBy?: SQL[]
	/** Clave i18n de la notificación inicial de `create` (por defecto `<prefijo>.create.loading`). */
	createLoadingKey?: string
	/** Construye la fila a insertar. Por defecto: `data` + `created_at`/`updated_at`. */
	toInsert?: (data: TCreate, ctx: CrudMutationContext) => CrudInsert<TTable> | Promise<CrudInsert<TTable>>
	/** Construye el payload de `update`. Por defecto: `data` + `updated_at`. */
	toUpdate?: (
		current: CrudRow<TTable>,
		data: TUpdate,
	) => Partial<CrudRow<TTable>> | Promise<Partial<CrudRow<TTable>>>
	/**
	 * Si se define, `remove` y `restore` usan borrado lógico.
	 *
	 * Al habilitarlo hay que añadir las claves i18n `<i18nPrefix>.restore.*`
	 * (loading/success/error) al idioma correspondiente.
	 */
	softDelete?: CrudSoftDelete
	/** Columna `internal`: las filas internas no se borran ni se purgan. */
	internalColumn?: AnyColumn
	/** Referencias entrantes que bloquean el borrado hasta desvincularlas. */
	references?: CrudReference[]
}

export interface CrudApi<TTable extends SQLiteTable, TKey extends string | number, TCreate, TUpdate> {
	findAll: (options?: CrudListOptions) => Promise<CrudRow<TTable>[]>
	/** Busca por clave aplicando (o no) el filtro de soft-delete. */
	find: (key: TKey, options?: CrudListOptions) => Promise<CrudRow<TTable> | undefined>
	create: (data: TCreate) => Promise<CrudRow<TTable> | undefined>
	update: (key: TKey, data: TUpdate) => Promise<CrudRow<TTable> | undefined>
	/**
	 * Borra la fila. Sin opciones hace borrado lógico (o físico si la entidad no
	 * tiene soft-delete). Con `{ purge: true }` elimina físicamente una fila que
	 * ya está en la papelera. Con `{ unlink: true }` desvincula las referencias.
	 */
	remove: (key: TKey, options?: CrudRemoveOptions) => Promise<boolean>
	/** Reactiva una fila soft-deleted. Si la entidad no usa soft-delete, devuelve `false`. */
	restore: (key: TKey) => Promise<boolean>
	/** Vacía la papelera de la tabla, respetando referencias e `internal`. */
	purgeDeleted: () => Promise<CrudPurgeAllResult>
	/** Filas de otras entidades que apuntan a `key`. */
	findReferences: (key: TKey) => Promise<CrudReferenceMatch[]>
	/** `true` si la entidad está configurada con soft-delete. */
	supportsSoftDelete: boolean
}
