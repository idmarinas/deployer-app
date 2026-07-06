/**
 * Normalización de filas devueltas por Drizzle (lecturas via query_raw).
 *
 * Dos limitaciones conocidas y sin solución nativa en Drizzle/drizzle-kit
 * para SQLite, confirmadas en issues abiertos del propio repositorio:
 *
 * 1. `drizzle-kit introspect` no detecta columnas BOOLEAN: SQLite no tiene
 *    storage class boolean (se guarda como INTEGER 0/1), y la introspección
 *    mapea cualquier tipo no reconocido exactamente a `numeric()`, que en
 *    TypeScript se infiere como `string`. No hay flag ni opción de config
 *    (ni en drizzle.config.ts ni en la CLI) para forzar `{ mode: 'boolean' }`
 *    en columnas concretas — pedirlo así reaparece tras cada introspección.
 *
 * 2. Drizzle no tiene opción para convertir `null` a `undefined`. SQL usa
 *    NULL, JS/TS usa undefined para "ausente"; Drizzle refleja el modelo SQL
 *    fielmente, así que cualquier columna nullable sale como `T | null`.
 *
 * Este módulo corrige ambos casos DESPUÉS de la query, sin tocar
 * `schema.ts` ni `relations.ts` (que se regeneran con `bun run db:introspect`
 * y no deben editarse a mano).
 */

/**
 * Nombres de columna que en BD son `numeric()` (string en TS) pero
 * representan booleanos lógicos reales (0/1, "0"/"1").
 *
 * Mantener esta lista junto a las migraciones SQL: si una migración nueva
 * añade una columna BOOLEAN, añadir su nombre aquí también.
 */
const BOOLEAN_KEYS = new Set<string>(['enabled', 'is_secret', 'is_global'])

/**
 * Decide cómo transformar un valor de columna concreto.
 * - Columnas en BOOLEAN_KEYS: 1 / '1' / true -> true; cualquier otra cosa -> false.
 * - Resto: null -> undefined; el resto de valores se devuelven sin tocar.
 */
function normalizeValue(key: string, value: unknown): unknown {
	if (BOOLEAN_KEYS.has(key)) {
		return value === 1 || value === '1' || value === true
	}

	if (value === null) {
		return undefined
	}

	return value
}

/**
 * Normaliza un objeto plano (una sola fila), sin bajar a propiedades anidadas.
 * Útil cuando ya sabes que el resultado no tiene relaciones anidadas.
 */
export function normalizeRow<T extends Record<string, unknown>>(row: T): T {
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(row)) {
		result[key] = normalizeValue(key, value)
	}

	return result as T
}

/**
 * Normaliza recursivamente un valor devuelto por Drizzle: objeto plano,
 * array de filas, o resultado anidado de `db.query.*.with`.
 *
 * Pensado para usarse justo antes de devolver el resultado de un composable
 * de `src/composables/queries/`, p. ej.:
 *
 *   const row = await db.query.projects.findFirst({ with: { ... } })
 *   return row ? (normalizeDeep(row) as ProjectRow) : undefined
 */
export function normalizeDeep<T>(value: T): T {
	if (value === null) {
		return undefined as T
	}

	if (Array.isArray(value)) {
		return value.map(item => normalizeDeep(item)) as T
	}

	if (typeof value === 'object' && !(value instanceof Date)) {
		const result: Record<string, unknown> = {}

		for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
			result[key] = normalizeValue(key, normalizeDeep(raw))
		}

		return result as T
	}

	return value
}
