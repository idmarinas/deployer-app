import { describe, expect, it } from 'bun:test'

import type { JsonSchema } from 'json-schema-library'

import compose from '@/schemas/compose-spec.json'
import composer from '@/schemas/composer-schema.json'
import { classifyNode, compileRoot, resolveNode } from '../src/utils/schema-form/jsl'
import {
	WIDGET_KEY,
	booleanStringNormalizer,
	normalizeSchema,
	widgetsNormalizer,
} from '../src/utils/schema-form/normalize'
import { validateWithJsl } from '../src/utils/schema-form/validate'

describe('booleanStringNormalizer', () => {
	it('boolean|string (cualquier orden) → solo boolean', () => {
		expect(booleanStringNormalizer({ type: ['boolean', 'string'] })).toEqual({ type: 'boolean' })
		expect(booleanStringNormalizer({ type: ['string', 'boolean'] })).toEqual({ type: 'boolean' })
		expect(booleanStringNormalizer({ type: ['boolean', 'string'], description: 'x' })).toEqual({
			type: 'boolean',
			description: 'x',
		})
	})

	it('devuelve undefined si no aplica (tipos simples, uniones de 3+, sin type)', () => {
		expect(booleanStringNormalizer({ type: 'string' })).toBeUndefined()
		expect(booleanStringNormalizer({ type: 'boolean' })).toBeUndefined()
		expect(booleanStringNormalizer({ type: ['boolean', 'string', 'object'] })).toBeUndefined()
		expect(booleanStringNormalizer({ type: ['string', 'number', 'boolean'] })).toBeUndefined()
		expect(booleanStringNormalizer({ type: ['string', 'number', 'boolean', 'null'] })).toBeUndefined()
		expect(booleanStringNormalizer({ description: 'sin type' })).toBeUndefined()
	})
})

describe('normalizeSchema', () => {
	it('sin normalizadores devuelve el mismo schema sin recorrer', () => {
		const schema: JsonSchema = { properties: { a: { type: ['boolean', 'string'] } } }
		expect(normalizeSchema(schema)).toBe(schema)
	})

	it('aplica normalizadores a cada nodo (booleanString recorre las claves estándar)', () => {
		const schema: JsonSchema = {
			properties: { a: { type: ['boolean', 'string'] } },
			patternProperties: { '^x': { type: ['string', 'boolean'] } },
			oneOf: [{ type: ['boolean', 'string'] }],
			$defs: { x: { type: ['boolean', 'string'] } },
			items: { type: ['boolean', 'string'] },
		}
		const out = normalizeSchema(schema, booleanStringNormalizer)
		expect(out.properties?.a.type).toBe('boolean')
		expect(out.patternProperties?.['^x'].type).toBe('boolean')
		expect(out.oneOf?.[0].type).toBe('boolean')
		expect((out.$defs as Record<string, JsonSchema>).x.type).toBe('boolean')
		expect(out.items?.type).toBe('boolean')
	})

	it('aplica varios normalizadores en orden', () => {
		const marker: Parameters<typeof normalizeSchema>[1] = (schema) => {
			if (schema.title === 'marcar') return { ...schema, title: 'marcado' }
			return undefined
		}
		const out = normalizeSchema(
			{ properties: { a: { title: 'marcar', type: ['boolean', 'string'] } } },
			booleanStringNormalizer,
			marker,
		)
		expect(out.properties?.a.type).toBe('boolean')
		expect(out.properties?.a.title).toBe('marcado')
	})

	it('no muta el schema original', () => {
		const schema: JsonSchema = { properties: { a: { type: ['boolean', 'string'] } } }
		normalizeSchema(schema, booleanStringNormalizer)
		expect((schema.properties as Record<string, any>).a.type).toEqual(['boolean', 'string'])
	})

	it('con compose-spec los campos boolean|string quedan boolean', () => {
		const { root } = compileRoot(normalizeSchema(compose as never, booleanStringNormalizer))
		const services = root.getNode('/services', {}).node
		const svc = resolveNode(services.properties?.['missing-key'] ?? services)
		expect(classifyNode(resolveNode(svc.properties.attach)).kind).toBe('boolean')
		expect(classifyNode(resolveNode(svc.properties.privileged)).kind).toBe('boolean')
		expect(classifyNode(resolveNode(svc.properties.read_only)).kind).toBe('boolean')

		const raw = normalizeSchema(compose as never, booleanStringNormalizer) as Record<string, any>
		expect(raw.$defs.healthcheck.properties.disable.type).toBe('boolean')
	})

	it('con compose-spec las uniones de 3+ tipos se conservan', () => {
		const { root } = compileRoot(normalizeSchema(compose as never, booleanStringNormalizer))
		const networks = root.getNode('/networks', {}).node
		const net = resolveNode(networks.properties?.['missing-key'] ?? networks)
		expect(classifyNode(resolveNode(net.properties.external)).kind).toBe('union')
	})

	it('sin normalizadores el composer conserva su unión boolean|string (abandoned)', () => {
		const out = normalizeSchema(composer as never) as Record<string, any>
		expect(out.properties.abandoned.type).toEqual(['boolean', 'string'])
	})
})

describe('widgetsNormalizer', () => {
	const marker = (raw: Record<string, any>) => raw[WIDGET_KEY]

	it('marca solo el nodo cuyo JSON pointer coincide', () => {
		const out = normalizeSchema(
			{
				$defs: { service: { properties: { image: { type: 'string' } } } },
				properties: { image: { type: 'string' } },
			},
			widgetsNormalizer({ '#/$defs/service/properties/image': 'compose-image' }),
		) as Record<string, any>

		expect(marker(out.$defs.service.properties.image)).toBe('compose-image')
		expect(marker(out.properties.image)).toBeUndefined()
	})

	it('escapa ~ y / en los segmentos del pointer', () => {
		const out = normalizeSchema(
			{ properties: { 'a/b~c': { type: 'string' } } },
			widgetsNormalizer({ '#/properties/a~1b~0c': 'compose-image' }),
		) as Record<string, any>

		expect(marker(out.properties['a/b~c'])).toBe('compose-image')
	})

	it('con compose-spec marca service.image y sobrevive a la resolución de $ref', () => {
		const { root } = compileRoot(
			normalizeSchema(compose as never, booleanStringNormalizer, widgetsNormalizer({
				'#/$defs/service/properties/image': 'compose-image',
			})),
		)
		const services = root.getNode('/services', {}).node
		const svc = resolveNode(services.properties?.['missing-key'] ?? services)
		const img = resolveNode(svc.properties.image)
		expect(classifyNode(img).kind).toBe('string')
		expect((img.schema as Record<string, unknown>)[WIDGET_KEY]).toBe('compose-image')
	})

	it('el marcado x-widget no genera warnings en la validación de jsl', () => {
		const { root } = compileRoot({ properties: { image: { type: 'string', [WIDGET_KEY]: 'compose-image' } } })
		const result = validateWithJsl(root, { image: 'nginx:latest' }, (key) => key)
		expect(result.errors).toEqual({})
		expect(result.warnings).toEqual({})
	})
})
