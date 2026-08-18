import { describe, expect, it } from 'bun:test'

import compose from '@/schemas/compose-spec.json'
import { activeVariantIndex, classifyNode, compileRoot, resolveNode, variantDefault } from '../src/utils/schema-form/jsl'

describe('render de componentes (Fase 3)', () => {
	const { root, draft } = compileRoot(compose as never)

	it('detecta el draft y las propiedades raíz', () => {
		expect(draft).toBe('draft-2020-12')
		const names = Object.keys(root.properties ?? {})
		expect(names).toEqual(expect.arrayContaining(['version', 'name', 'include', 'services', 'models', 'networks', 'volumes', 'secrets', 'configs']))
	})

	it('clasifica los hijos de la raíz', () => {
		const props = root.properties ?? {}
		expect(classifyNode(props.version).kind).toBe('string')
		expect(classifyNode(props.name).kind).toBe('string')
		expect(classifyNode(props.include).kind).toBe('array')
		for (const key of ['services', 'models', 'networks', 'volumes', 'secrets', 'configs']) {
			expect(classifyNode(props[key]).kind).toBe('map')
		}
	})

	it('services es un mapa cuyo valueNode resuelve el $ref de servicio', () => {
		const services = (root.properties ?? {}).services
		const valueNode = resolveNode(services.patternProperties?.[0]?.node)
		expect(valueNode?.type).toBe('object')
		expect(Object.keys(valueNode?.properties ?? {})).toHaveLength(93)
	})

	it('include es un array con items union (string/object)', () => {
		const include = (root.properties ?? {}).include
		const item = resolveNode(include.items)
		const kinds = item?.oneOf?.map((v) => classifyNode(v).kind) ?? []
		expect(kinds).toEqual(['string', 'object'])
		const data = { include: 'docker-compose.override.yml' }
		expect(activeVariantIndex(item, data, 'include')).toBe(0)
		expect(variantDefault(item)).toBe('')
	})

	it('variantDefault de un servicio nuevo es un objeto', () => {
		const services = (root.properties ?? {}).services
		const valueNode = resolveNode(services.patternProperties?.[0]?.node)
		const value = variantDefault(valueNode)
		expect(value).toEqual({})
	})
})
