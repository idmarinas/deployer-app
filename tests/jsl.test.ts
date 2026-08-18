import { describe, expect, it } from 'bun:test'

import { compileSchema } from 'json-schema-library'

import composer from '@/schemas/composer-schema.json'
import compose from '@/schemas/compose-spec.json'
import { classifyNode, compileRoot, activeVariantIndex, isContainerNode, preferredVariant, resolveNode, variantDefault, variantLabel } from '../src/utils/schema-form/jsl'
import { getAt, pathToPointer, pointerToPath, setAt } from '../src/utils/schema-form/paths'

describe('compileRoot', () => {
	it('detecta el draft de cada esquema', () => {
		expect(compileRoot(compose as never).draft).toBe('draft-2020-12')
		expect(compileRoot(composer as never).draft).toBe('draft-04')
	})

	it('expone el nodo raíz', () => {
		const { root } = compileRoot(compose as never)
		expect(classifyNode(root).kind).toBe('object')
	})
})

describe('classifyNode', () => {
	function node(schema: Record<string, any>) {
		return compileSchema(schema)
	}

	it('tipos simples', () => {
		expect(classifyNode(node({ type: 'string' })).kind).toBe('string')
		expect(classifyNode(node({ type: 'number' })).kind).toBe('number')
		expect(classifyNode(node({ type: 'integer' })).kind).toBe('integer')
		expect(classifyNode(node({ type: 'boolean' })).kind).toBe('boolean')
	})

	it('type "null" → kind null nullable', () => {
		const cls = classifyNode(node({ type: 'null' }))
		expect(cls.kind).toBe('null')
		expect(cls.nullable).toBe(true)
	})

	it('type ["string","null"] → string nullable (caso habitual)', () => {
		const cls = classifyNode(node({ type: ['string', 'null'] }))
		expect(cls.kind).toBe('string')
		expect(cls.nullable).toBe(true)
	})

	it('type ["string"] → equivale a string', () => {
		const cls = classifyNode(node({ type: ['string'] }))
		expect(cls.kind).toBe('string')
		expect(cls.nullable).toBe(false)
	})

	it('type ["string","number"] → union de formatos', () => {
		const cls = classifyNode(node({ type: ['string', 'number'] }))
		expect(cls.kind).toBe('union')
		expect(cls.isUnion).toBe(true)
		expect(cls.variants?.map((v) => classifyNode(v).kind)).toEqual(['string', 'number'])
	})

	it('type ["string","number","null"] → union + nullable', () => {
		const cls = classifyNode(node({ type: ['string', 'number', 'null'] }))
		expect(cls.kind).toBe('union')
		expect(cls.nullable).toBe(true)
		expect(cls.variants?.length).toBe(2)
	})

	it('enum y const', () => {
		expect(classifyNode(node({ enum: ['a', 'b'] })).kind).toBe('enum')
		expect(classifyNode(node({ const: 'x' })).kind).toBe('enum')
	})

	it('oneOf y anyOf → union con variantes', () => {
		const one = classifyNode(node({ oneOf: [{ type: 'string' }, { type: 'object' }] }))
		expect(one.kind).toBe('union')
		expect(one.variants?.length).toBe(2)
		const any = classifyNode(node({ anyOf: [{ type: 'string' }, { type: 'number' }] }))
		expect(any.kind).toBe('union')
		expect(any.variants?.length).toBe(2)
	})

	it('properties → object', () => {
		expect(classifyNode(node({ type: 'object', properties: { a: { type: 'string' } } })).kind).toBe('object')
		expect(classifyNode(node({ properties: { a: { type: 'string' } } })).kind).toBe('object')
	})

	it('patternProperties / additionalProperties → map', () => {
		expect(classifyNode(node({ patternProperties: { '^x': { type: 'string' } } })).kind).toBe('map')
		expect(classifyNode(node({ type: 'object', additionalProperties: { type: 'string' } })).kind).toBe('map')
		expect(classifyNode(node({ type: 'object', additionalProperties: true })).kind).toBe('map')
	})

	it('esquema vacío → any', () => {
		expect(classifyNode(node({})).kind).toBe('any')
	})
})

describe('resolveNode', () => {
	it('resuelve $ref contra $defs', () => {
		const root = compileSchema({
			type: 'object',
			$defs: { person: { type: 'object', properties: { name: { type: 'string' } } } },
			properties: { author: { $ref: '#/$defs/person' } },
		})
		const resolved = resolveNode(root.properties!.author)
		expect(resolved.type).toBe('object')
		expect(resolved.properties?.name).toBeDefined()
	})

	it('fusiona allOf', () => {
		const root = compileSchema({
			type: 'object',
			allOf: [{ type: 'object', properties: { a: { type: 'string' } } }, { required: ['a'] }],
		})
		const resolved = resolveNode(root)
		expect(resolved.type).toBe('object')
		expect(Object.keys(resolved.properties ?? {})).toEqual(['a'])
		expect(resolved.required).toEqual(['a'])
	})

	it('termina ante referencias cíclicas', () => {
		const root = compileSchema({
			type: 'object',
			$defs: {
				node: { type: 'object', properties: { children: { type: 'array', items: { $ref: '#/$defs/node' } }, value: { type: 'string' } } },
			},
			properties: { root: { $ref: '#/$defs/node' } },
		})
		const resolved = resolveNode(root.properties!.root)
		expect(resolved.type).toBe('object')
		expect(resolved.properties?.children?.type).toBe('array')
	})

	it('$ref dentro de $ref del esquema compose (services)', () => {
		const root = compileSchema(compose as never)
		const services = root.properties!.services
		const pattern = services?.patternProperties?.[0]?.node
		expect(pattern?.$ref).toBeDefined()
		const resolved = resolveNode(pattern!)
		expect(resolved.type).toBe('object')
		expect(Object.keys(resolved.properties ?? {}).length).toBeGreaterThan(50)
		const build = resolved.properties?.build
		expect(build?.oneOf?.map((o) => o.type)).toEqual(['string', 'object'])
	})
})

describe('activeVariantIndex', () => {
	const root = compileSchema({
		type: 'object',
		properties: {
			build: { oneOf: [{ type: 'string' }, { type: 'object', properties: { a: { type: 'string' } } }] },
		},
	})

	it('reduce vía getNode con datos', () => {
		const build = root.getNode('/build', { build: 'x' }).node!
		expect(activeVariantIndex(build, { build: 'x' }, 'build')).toBe(0)
		const buildObj = root.getNode('/build', { build: { a: 'b' } }).node!
		expect(activeVariantIndex(buildObj, { build: { a: 'b' } }, 'build')).toBe(1)
	})

	it('fallback por tipo JS con datos vacíos', () => {
		const build = root.properties!.build
		expect(activeVariantIndex(build, { build: 'texto' }, 'build')).toBe(0)
		expect(activeVariantIndex(build, { build: { a: 'b' } }, 'build')).toBe(1)
		expect(activeVariantIndex(build, {}, 'build')).toBeUndefined()
	})
})

describe('preferredVariant / variantDefault / variantLabel', () => {
	it('preferredVariant descarta any y prioriza string', () => {
		const root = compileSchema({ oneOf: [{}, { type: 'array' }, { type: 'string' }] })
		expect(classifyNode(preferredVariant(root)!).kind).toBe('string')
	})

	it('variantDefault por tipo', () => {
		expect(variantDefault(compileSchema({ type: 'string' }))).toBe('')
		expect(variantDefault(compileSchema({ type: 'number' }))).toBe(0)
		expect(variantDefault(compileSchema({ type: 'boolean' }))).toBe(false)
		expect(variantDefault(compileSchema({ type: 'null' }))).toBe(null)
		expect(variantDefault(compileSchema({ enum: ['x', 'y'] }))).toBe('x')
		expect(variantDefault(compileSchema({ type: 'array' }))).toEqual([])
	})

	it('variantDefault de union cede a la preferida', () => {
		const root = compileSchema({ oneOf: [{}, { type: 'string' }, { type: 'array' }] })
		expect(variantDefault(root)).toBe('')
	})

	it('variantLabel usa title o kind', () => {
		expect(variantLabel(compileSchema({ type: 'string', title: 'Texto' }))).toBe('Texto')
		expect(variantLabel(compileSchema({ type: 'boolean' }))).toBe('boolean')
	})
})

describe('uniones por type array (sin oneOf)', () => {
	it('classifyNode genera variantes string/number/boolean', () => {
		const root = compileSchema({ type: ['string', 'number', 'boolean'] })
		const cls = classifyNode(root)
		expect(cls.kind).toBe('union')
		expect(cls.nullable).toBe(false)
		expect(cls.variants?.map((v) => classifyNode(v).kind)).toEqual(['string', 'number', 'boolean'])
	})

	it('activeVariantIndex resuelve por tipo JS del valor', () => {
		const root = compileSchema({ type: ['string', 'number', 'boolean'] })
		expect(activeVariantIndex(root, { x: 'a' }, 'x')).toBe(0)
		expect(activeVariantIndex(root, { x: 5 }, 'x')).toBe(1)
		expect(activeVariantIndex(root, { x: false }, 'x')).toBe(2)
		expect(activeVariantIndex(root, {}, 'x')).toBeUndefined()
	})

	it('preferredVariant y variantDefault funcionan sin oneOf', () => {
		const root = compileSchema({ type: ['string', 'number', 'boolean'] })
		expect(classifyNode(preferredVariant(root)!).kind).toBe('string')
		expect(variantDefault(root)).toBe('')
	})

	it('union nullable por type array conserva la detección de null', () => {
		const root = compileSchema({ type: ['string', 'number', 'boolean', 'null'] })
		const cls = classifyNode(root)
		expect(cls.kind).toBe('union')
		expect(cls.nullable).toBe(true)
		expect(cls.variants?.map((v) => classifyNode(v).kind)).toEqual(['string', 'number', 'boolean'])
		expect(variantDefault(root)).toBe('')
	})
})

describe('isContainerNode', () => {
	const { root } = compileRoot(compose as never)
	const servicesNode = root.getNode('/services', {}).node
	const svc = resolveNode(servicesNode.properties?.['missing-key'] ?? servicesNode)
	const props = svc.properties ?? {}

	it('los contenedores de service se detectan como tales', () => {
		expect(isContainerNode(props.build)).toBe(true)
		expect(isContainerNode(props.devices)).toBe(true)
		expect(isContainerNode(props.healthcheck)).toBe(true)
		expect(isContainerNode(props.environment)).toBe(true)
		expect(isContainerNode(props.depends_on)).toBe(true)
	})

	it('los simples de service se detectan como simples', () => {
		expect(isContainerNode(props.image)).toBe(false)
		expect(isContainerNode(props.attach)).toBe(false)
		expect(isContainerNode(props.hostname)).toBe(false)
		expect(isContainerNode(props.cpus)).toBe(false)
	})
})

describe('paths · pathToPointer / pointerToPath', () => {
	it('round trip de rutas y punteros', () => {
		expect(pathToPointer('')).toBe('#')
		expect(pathToPointer('a.b[0]')).toBe('#/a/b/0')
		expect(pointerToPath('#/a/b/0')).toBe('a.b[0]')
		expect(pointerToPath('')).toBe('')
		expect(pointerToPath('#')).toBe('')
		expect(pathToPointer(pointerToPath(pathToPointer('a.b[0]')))).toBe('#/a/b/0')
	})

	it('puntero de errores se traduce a rutas de getAt', () => {
		const data: Record<string, any> = {}
		setAt(data, 'authors[0].name', 'alice')
		expect(getAt(data, pointerToPath('#/authors/0/name'))).toBe('alice')
	})
})
