import type { SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { count as drizzleCount } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * Cuenta filas de una tabla Drizzle que cumplen una condición, vía el proxy
 * de solo lectura (`db` -> `query_raw`). Sustituye a `useQuery().count()`
 * (SQL manual interpolado + `DB_TABLES`), usado por los `.refine()` de
 * unicidad en `composables/schemas/*.ts`.
 *
 * Devuelve -1 en caso de error (mismo contrato que la implementación previa),
 * para que el `.refine()` que lo consume no lance una excepción durante la
 * validación del formulario.
 */
export async function countWhere(table: SQLiteTable, condition: SQL): Promise<number> {
	try {
		const [row] = await db.select({ value: drizzleCount() }).from(table).where(condition)
		return row?.value ?? -1
	} catch (e) {
		console.error('[countWhere] error:', e)
		return -1
	}
}
