import type { Variable } from '@/types/entities'

/**
 * Datos aceptados al actualizar una variable.
 *
 * `slug` queda fuera: es inmutable. `id` y `created_at` tampoco se actualizan.
 */
export type VariableUpdateData = Partial<Omit<Variable, 'id' | 'created_at' | 'slug'>>

/**
 * Construye el payload de `UPDATE` de una variable aplicando sus invariantes.
 *
 * - **`slug` inmutable:** se escribe siempre el valor actual, aunque el payload
 *   lo incluya por error. Las referencias guardadas (`{{global.<slug>}}`) siguen
 *   resolviendo.
 * - **`is_secret` unidireccional:** una variable secreta no puede volver a ser
 *   pública. Si la fila actual no era secreta, se permite el cambio a secreta.
 * - **`is_secret` siempre presente:** el proxy Drizzle cifra `value` de forma
 *   condicional leyendo `is_secret` de la misma sentencia. Si no viaja en el
 *   `SET`, un valor nuevo se guardaría en claro.
 */
export function normalizeVariableUpdate(
	current: Pick<Variable, 'slug' | 'is_secret'>,
	data: VariableUpdateData,
	now = new Date().toISOString(),
): Partial<Omit<Variable, 'id' | 'created_at'>> {
	return {
		...data,
		slug: current.slug,
		is_secret: current.is_secret ? true : (data.is_secret ?? false),
		updated_at: now,
	}
}
