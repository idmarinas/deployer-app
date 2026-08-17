import type { JsonSchema } from 'json-schema-library'

const SCHEMA_MAP_KEYS = ['properties', 'patternProperties', '$defs', 'definitions'] as const
const SCHEMA_ARRAY_KEYS = ['oneOf', 'anyOf', 'allOf', 'prefixItems'] as const
const SCHEMA_KEYS = ['items', 'additionalProperties', 'not', 'contains'] as const

export type SchemaNormalizer = (schema: Record<string, any>, pointer: string) => Record<string, any> | undefined

function escapePointer(segment: string): string {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1')
}

function walk(node: JsonSchema, normalizers: readonly SchemaNormalizer[], pointer: string): JsonSchema {
	if (Array.isArray(node)) return node.map((v, i) => walk(v as JsonSchema, normalizers, `${pointer}/${i}`))
	if (!node || typeof node !== 'object') return node

	let current: JsonSchema = node
	for (const normalize of normalizers) {
		const next = normalize(current, pointer)
		if (next && next !== current) current = next
	}

	const out: JsonSchema = { ...current }

	for (const key of SCHEMA_MAP_KEYS) {
		const map = out[key]
		if (map && typeof map === 'object') {
			const next: Record<string, JsonSchema> = {}
			for (const [name, value] of Object.entries(map)) {
				next[name] = walk(value as JsonSchema, normalizers, `${pointer}/${key}/${escapePointer(name)}`)
			}
			;(out as Record<string, unknown>)[key] = next
		}
	}

	for (const key of SCHEMA_ARRAY_KEYS) {
		const arr = out[key]
		if (Array.isArray(arr)) {
			;(out as Record<string, unknown>)[key] = arr.map((v, i) => walk(v as JsonSchema, normalizers, `${pointer}/${key}/${i}`))
		}
	}

	for (const key of SCHEMA_KEYS) {
		const value = out[key]
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			;(out as Record<string, unknown>)[key] = walk(value as JsonSchema, normalizers, `${pointer}/${key}`)
		}
	}

	return out
}

/**
 * Normalizador de nodo: convierte las uniones exactas `boolean | string` (en cualquier orden)
 * en `boolean`. En algunos esquemas (p.ej. compose-spec) el `string` solo existe para que
 * ciertos parsers no fallen al leer `true`/`false` como texto; el valor semántico es booleano.
 * Las uniones de 3+ tipos se dejan intactas. Si no aplica devuelve `undefined`.
 */
export function booleanStringNormalizer(schema: Record<string, any>): Record<string, any> | undefined {
	const types = schema.type
	if (Array.isArray(types) && types.length === 2 && types.includes('boolean') && types.includes('string')) {
		return { ...schema, type: 'boolean' }
	}
	return undefined
}

/**
 * Aplica una lista de normalizadores a todo el JSON Schema (clona y recorre `properties`,
 * `patternProperties`, `$defs`, `definitions`, `oneOf`/`anyOf`/`allOf`/`prefixItems`, `items`,
 * `additionalProperties`, `not`, `contains`). Cada nodo pasa por los normalizadores en orden;
 * un normalizador devuelve un nodo nuevo o `undefined` si no cambia nada. Cada editor elige
 * sus normalizadores (p.ej. compose usa `booleanStringNormalizer`, composer ninguno).
 * Sin normalizadores devuelve el schema sin recorrerlo.
 */
export function normalizeSchema(schema: JsonSchema, ...normalizers: SchemaNormalizer[]): JsonSchema {
	if (normalizers.length === 0) return schema
	return walk(schema, normalizers, '#')
}

/**
 * Clave de marcado que usan los normalizadores para declarar el widget con el que
 * renderizar un nodo. jsl ignora las claves `x-*`, por lo que no genera warnings.
 * El valor es el nombre del widget, que el editor resuelve contra su mapa `widgets`.
 */
export const WIDGET_KEY = 'x-widget'

/**
 * Normalizador de widgets: marca un nodo con {@link WIDGET_KEY} cuando su JSON pointer
 * (raíz `#`, p.ej. `#/$defs/service/properties/image`) está en el mapa. El mapa asocia
 * pointer → nombre de widget. Cada editor resuelve el nombre con sus propios componentes.
 */
export function widgetsNormalizer(widgets: Record<string, string>): SchemaNormalizer {
	return (schema, pointer) => {
		const widget = widgets[pointer]
		if (!widget) return undefined
		return { ...schema, [WIDGET_KEY]: widget }
	}
}
