import type { Composer } from 'vue-i18n'

import useToaster from '@/composables/useToaster'

// ====================================================================
// Errores estructurados de las operaciones CRUD
// ====================================================================

export type QueryOperation = 'findAll' | 'find' | 'create' | 'update' | 'remove'

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
