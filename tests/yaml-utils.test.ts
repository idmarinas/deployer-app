import { describe, expect, it } from 'bun:test'

import { parseYaml, toYaml } from '../src/utils/yaml-utils'

describe('parseYaml', () => {
	it('convierte YAML en objeto', () => {
		expect(parseYaml('services:\n  web:\n    image: nginx\n')).toEqual({
			services: { web: { image: 'nginx' } },
		})
	})

	it('tolera tabs e indentación habitual de compose', () => {
		expect(parseYaml('version: "3"\nname: demo\n')).toEqual({ version: '3', name: 'demo' })
	})

	it('lanza error con sintaxis inválida', () => {
		expect(() => parseYaml('services:\n  web: [unclosed')).toThrow()
	})

	it('redondea con toYaml', () => {
		const data = { services: { web: { image: 'nginx' } } }
		expect(parseYaml(toYaml(data))).toEqual(data)
	})
})
