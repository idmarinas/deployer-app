import type { JsonSchema, SchemaNode } from 'json-schema-library'
import { compileSchema as jslCompileSchema, mergeNode } from 'json-schema-library'

import { getAt } from './paths'

export type FieldKind = 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'enum' | 'array' | 'object' | 'map' | 'union' | 'any'

export interface NodeClass {
	kind: FieldKind
	nullable: boolean
	isUnion: boolean
	isMap: boolean
	variants?: SchemaNode[]
}

export interface CompiledFormSchema {
	root: SchemaNode
	draft: string
}

/**
 * Compila un JSON Schema con jsl y expone la versión de draft detectada.
 */
export function compileRoot(schema: JsonSchema): CompiledFormSchema {
	const root = jslCompileSchema(schema)
	return { root, draft: root.getDraftVersion() }
}

function kindFromType(type: string | undefined): FieldKind {
	switch (type) {
		case 'string':
			return 'string'
		case 'number':
			return 'number'
		case 'integer':
			return 'integer'
		case 'boolean':
			return 'boolean'
		case 'null':
			return 'null'
		case 'array':
			return 'array'
		case 'object':
			return 'object'
		default:
			return 'any'
	}
}

function typeInfo(node: SchemaNode): { nullable: boolean; types: string[] } {
	const type = node.type
	if (Array.isArray(type)) {
		return { nullable: type.includes('null'), types: type.filter((t) => t !== 'null') }
	}
	return { nullable: type === 'null', types: type ? [type] : [] }
}

function makeTypeVariant(node: SchemaNode, type: string): SchemaNode {
	const schema: JsonSchema = { ...node.schema, type }
	delete schema.oneOf
	delete schema.anyOf
	delete schema.allOf
	delete schema.enum
	delete schema.const
	return node.compileSchema(schema)
}

function inferMap(node: SchemaNode, raw: Record<string, unknown>): boolean {
	return Boolean(node.patternProperties && node.patternProperties.length > 0) || raw.additionalProperties !== undefined
}

/**
 * Clasifica un nodo compilado de jsl en un "kind" legible para el formulario.
 * `node.type` puede ser un array (p.ej. `['string','null']`):
 * - `['<tipo>','null']` (caso habitual) → tipo nullable.
 * - `['<tipo>']` → equivale a `type: '<tipo>'`.
 * - varios tipos sin `null` → union de formatos.
 * - varios tipos con `null` → union + nullable.
 * - `'null'` solo → campo null.
 */
export function classifyNode(node: SchemaNode): NodeClass {
	const raw = node.schema as Record<string, unknown>
	const { nullable, types } = typeInfo(node)

	const enumValues = node.enum && node.enum.length > 0 ? node.enum : 'const' in raw ? [raw.const] : undefined
	if (enumValues) {
		return { kind: 'enum', nullable, isUnion: false, isMap: false }
	}
	if (node.oneOf && node.oneOf.length > 0) {
		return { kind: 'union', nullable, isUnion: true, isMap: false, variants: node.oneOf }
	}
	if (node.anyOf && node.anyOf.length > 0) {
		return { kind: 'union', nullable, isUnion: true, isMap: false, variants: node.anyOf }
	}

	if (types.length === 0) {
		if (node.properties && Object.keys(node.properties).length > 0) {
			return { kind: 'object', nullable, isUnion: false, isMap: false }
		}
		if (inferMap(node, raw)) {
			return { kind: 'map', nullable, isUnion: false, isMap: true }
		}
		return { kind: 'any', nullable, isUnion: false, isMap: false }
	}

	if (types.length === 1) {
		const kind = kindFromType(types[0])
		if (kind === 'object' || kind === 'any') {
			const isMap = !node.properties && inferMap(node, raw)
			return { kind: isMap ? 'map' : 'object', nullable, isUnion: false, isMap: isMap }
		}
		return { kind, nullable, isUnion: false, isMap: false }
	}

	return {
		kind: 'union',
		nullable,
		isUnion: true,
		isMap: false,
		variants: types.map((t) => makeTypeVariant(node, t)),
	}
}

/**
 * Devuelve el nodo "resuelto": aplica `$ref` (vía resolveRef de jsl) y fusiona
 * `allOf` (vía mergeNode de jsl). No usa utilidades propias de referencias.
 */
export function resolveNode(node: SchemaNode): SchemaNode {
	let current = node
	if (current.$ref) {
		try {
			const resolved = current.resolveRef()
			if (resolved) current = resolved
		} catch {}
	}
	if (current.allOf && current.allOf.length > 0) {
		let merged: SchemaNode | undefined
		for (const part of current.allOf) {
			const resolvedPart = resolveNode(part)
			merged = merged ? mergeNode(merged, resolvedPart) : resolvedPart
		}
		if (merged) {
			const combined = mergeNode(merged, current, 'allOf')
			if (combined) current = combined
		}
	}
	return current
}

/**
 * Indica si un nodo es un "contenedor" (array/map/object/any) o una unión con
 * alguna variante contenedora. Las uniones de solo simples (p.ej. `boolean|string`)
 * se consideran simples. Se usa para ordenar los hijos de un objeto: simples primero
 * y contenedores como pestañas.
 */
export function isContainerNode(node: SchemaNode): boolean {
	const cls = classifyNode(resolveNode(node))
	if (cls.kind === 'union' && cls.variants && cls.variants.length > 0) {
		return cls.variants.some((v) => isContainerNode(v))
	}
	return cls.kind === 'array' || cls.kind === 'map' || cls.kind === 'object' || cls.kind === 'any'
}

/**
 * Variantes de un nodo union, venga de `oneOf`/`anyOf` o de un `type` array
 * (p.ej. `['string','number','boolean']`). Para el caso `type` array jsl no
 * expone `oneOf`, así que las variantes se generan con `classifyNode`.
 */
export function unionVariants(node: SchemaNode): SchemaNode[] {
	const cls = classifyNode(node)
	return cls.kind === 'union' && cls.variants ? cls.variants : []
}

/**
 * Detecta la variante activa de un nodo union (oneOf/anyOf) para un valor dado.
 * Reduce el propio nodo con su valor (`getNode('#', valor)` → `oneOfIndex` de jsl);
 * si no hay valor que reduzca, hace un fallback por tipo JS.
 */
export function activeVariantIndex(node: SchemaNode, data: unknown, path: string): number | undefined {
	const value = getAt(data, path)
	try {
		const reduced = node.getNode('#', value)
		if (reduced.node && reduced.node.oneOfIndex !== undefined) return reduced.node.oneOfIndex
	} catch {}
	return variantIndexForValue(unionVariants(node), value)
}

function variantIndexForValue(variants: SchemaNode[], value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined
	const matches = (pred: (kind: FieldKind) => boolean): number | undefined => {
		const idx = variants.findIndex((v) => pred(classifyNode(v).kind))
		return idx >= 0 ? idx : undefined
	}
	if (typeof value === 'string') return matches((k) => k === 'string' || k === 'enum')
	if (typeof value === 'number') return matches((k) => k === 'number' || k === 'integer')
	if (typeof value === 'boolean') return matches((k) => k === 'boolean')
	if (Array.isArray(value)) return matches((k) => k === 'array')
	if (typeof value === 'object') return matches((k) => k === 'map' || k === 'object')
	return undefined
}

const PREFERRED_ORDER: FieldKind[] = ['string', 'array', 'map', 'object', 'number', 'integer', 'boolean', 'enum']

/**
 * Variante "amigable" de una union: descarta las variantes `any` y prioriza las
 * formas más habituales (string, lista, mapa, objeto…).
 */
export function preferredVariant(node: SchemaNode): SchemaNode | undefined {
	const variants = unionVariants(node)
	const candidates = variants.filter((v) => classifyNode(v).kind !== 'any')
	for (const kind of PREFERRED_ORDER) {
		const found = candidates.find((v) => classifyNode(v).kind === kind)
		if (found) return found
	}
	return undefined
}

/**
 * Valor por defecto razonable de un nodo para crear un item/entrada/variante nuevo:
 * las unions ceden a su variante preferida y `any` devuelve `undefined`.
 * Delegado en `getData()` de jsl (respeta `default` y tipos).
 */
export function variantDefault(node: SchemaNode): unknown {
	if (!node) return undefined
	const cls = classifyNode(node)
	if (cls.kind === 'any') return undefined
	if (cls.kind === 'union') {
		const preferred = preferredVariant(node)
		return preferred ? variantDefault(preferred) : undefined
	}
	try {
		return node.getData()
	} catch {
		return undefined
	}
}

/** Etiqueta legible de un nodo para selects de variantes: title o su tipo. */
export function variantLabel(node: SchemaNode): string {
	const title = node.schema.title
	if (typeof title === 'string' && title.trim()) return title
	return classifyNode(node).kind
}
