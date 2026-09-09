import type { Toast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { EntryKey, QueryCache } from '@pinia/colada'
import { DrizzleQueryError } from 'drizzle-orm'

import {
	ErrorFallback,
	QueryErrorInfo,
	QueryNotifierDeps,
	QueryOperation,
} from '@/composables/queries/shared.interfaces'
import { QueryRawError } from '@/drizzle/drizzle'

/**
 * Extrae el {@link QueryRawError} de un error capturado en una operación Drizzle.
 *
 * Drizzle envuelve los errores lanzados por el proxy en `DrizzleQueryError`,
 * conservando el original en `cause`; también se acepta un `QueryRawError` directo.
 */
export function toQueryRawError(e: unknown): QueryRawError | undefined {
	if (e instanceof QueryRawError) return e
	if (e instanceof DrizzleQueryError && e.cause instanceof QueryRawError) return e.cause

	return undefined
}

/**
 * Normaliza cualquier error capturado en un composable de query a
 * {@link QueryErrorInfo}. Si el proxy lanzó un {@link QueryRawError},
 * extrae la clave i18n y sus parámetros.
 */
export function toQueryErrorInfo(operation: QueryOperation, e: unknown): QueryErrorInfo {
	const queryError = toQueryRawError(e)

	if (queryError) {
		return {
			operation,
			message_key: queryError.message_key,
			message_params: queryError.message_params,
			raw: e,
		}
	}

	return { operation, raw: e }
}

// ====================================================================
// Helpers genéricos de resultados Drizzle
// ====================================================================

/**
 * Primera fila de un resultado Drizzle (`returning()`, `findMany()`, ...), o
 * `undefined` si no hay filas. Evita repetir el `rows[0]` + guard en cada query.
 */
export function firstRow<TEntity>(rows: TEntity[]): TEntity | undefined {
	return rows[0]
}

/**
 * Invalida (y refresca) todas las queries de la caché cuyo key empiece por `key`.
 * Equivalente a `cacheQuery.invalidateQueries({ key }, 'all')`, que las mutaciones
 * ejecutan tras cada escritura.
 *
 * Seguro fuera de setup: usar con la instancia de `useQueryCache()` del composable.
 */
export async function invalidateCacheQueries(cacheQuery: QueryCache, key: EntryKey): Promise<void> {
	await cacheQuery.invalidateQueries({ key }, 'all')
}

export type QueryNotifier = ReturnType<typeof createQueryNotifier>

/**
 * Agrupa las notificaciones del ciclo de vida de una operación CRUD, agnóstico
 * de tabla/entidad:
 *
 * - `loading`: aviso persistente (sin autodismiss) mientras dura la operación.
 * - `phase`: cambia el aviso persistente a la siguiente fase (mismo toast).
 * - `success`: cierra el ciclo con éxito.
 * - `fail`: si el error es un `QueryRawError` muestra su clave i18n; si no, usa
 *   los textos de fallback traducidos.
 *
 * Sin `noticeId` (lecturas `findAll`/`find`), `fail` crea un toast independiente;
 * con `noticeId` (mutaciones) actualiza el aviso persistente.
 */
export function createQueryNotifier({ toaster, t }: QueryNotifierDeps) {
	function loading(title: string, description?: string): Toast {
		return toaster.warning(title, description, { duration: 0 })
	}

	function phase(noticeId: string | number, title: string, description?: string): void {
		toaster.update(noticeId, 'warning', title, description)
	}

	function success(noticeId: string | number, title: string, description?: string): void {
		toaster.update(noticeId, 'success', title, description)
	}

	function fail(e: unknown, fallback: ErrorFallback, noticeId?: string | number): void {
		const queryError = toQueryRawError(e)
		const structured = queryError ? t(queryError.message_key, queryError.message_params) : undefined

		if (structured !== undefined) {
			if (noticeId === undefined) toaster.error(structured)
			else toaster.update(noticeId, 'error', structured)
		} else {
			if (noticeId === undefined) toaster.error(fallback.title, fallback.description)
			else toaster.update(noticeId, 'error', fallback.title, fallback.description)
		}
	}

	return { loading, phase, success, fail }
}
