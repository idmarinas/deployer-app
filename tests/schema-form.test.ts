import { describe, expect, it } from 'bun:test'
import type { SchemaNode } from 'json-schema-library'

import composer from '@/schemas/composer-schema.json'
import compose from '@/schemas/compose-spec.json'
import { classifyNode, compileRoot, resolveNode, variantDefault } from '../src/utils/schema-form/jsl'
import { deleteAt, getAt, setAt } from '../src/utils/schema-form/paths'
import { validateWithJsl } from '../src/utils/schema-form/validate'

function child(node: SchemaNode, name: string): SchemaNode | undefined {
	return node.properties?.[name]
}

function kinds(node: SchemaNode | undefined): string[] {
	const cls = classifyNode(node)
	if (!cls.isUnion || !cls.variants) return [cls.kind]
	return cls.variants.map((v) => classifyNode(v).kind)
}

describe('compileRoot y resolveNode ($ref/allOf)', () => {
	it('resuelve $ref contra definitions (authors de composer)', () => {
		const { root } = compileRoot(composer as never)
		const authors = resolveNode(child(root, 'authors')!)
		expect(classifyNode(authors).kind).toBe('array')
		expect(classifyNode(authors.items).kind).toBe('object')
		expect(Object.keys(authors.items?.properties ?? {})).toEqual(['name', 'email', 'homepage', 'role'])
		expect(authors.items?.required).toContain('name')
	})

	it('resuelve $ref del documento compose (service con 90+ props)', () => {
		const { root } = compileRoot(compose as never)
		const services = child(root, 'services')
		const serviceNode = resolveNode(services?.patternProperties?.[0]?.node!)
		expect(classifyNode(serviceNode).kind).toBe('object')
		expect(Object.keys(serviceNode.properties ?? {}).length).toBeGreaterThan(90)
	})

	it('no se queda sin terminar ante referencias cíclicas', () => {
		const schema = {
			type: 'object',
			$defs: {
				node: {
					type: 'object',
					properties: {
						children: { type: 'array', items: { $ref: '#/$defs/node' } },
						value: { type: 'string' },
					},
				},
			},
			properties: { root: { $ref: '#/$defs/node' } },
		}
		const { root } = compileRoot(schema as never)
		const node = resolveNode(child(root, 'root')!)
		expect(classifyNode(node).kind).toBe('object')
		expect(classifyNode(child(node, 'children')!).kind).toBe('array')
	})
})

describe('classifyNode · composer-schema', () => {
	const { root } = compileRoot(composer as never)

	it('raíz object y más de 150 nodos', () => {
		expect(classifyNode(root).kind).toBe('object')
		expect(root.toSchemaNodes().length).toBeGreaterThan(150)
	})

	it('multi-type genera union (license string/array)', () => {
		expect(classifyNode(child(root, 'license')).kind).toBe('union')
		expect(kinds(child(root, 'license'))).toEqual(['string', 'array'])
	})

	it('enum emite un único campo con opciones (minimum-stability)', () => {
		const stability = child(root, 'minimum-stability')
		expect(classifyNode(stability).kind).toBe('enum')
		expect(stability?.enum).toEqual(['dev', 'alpha', 'beta', 'rc', 'RC', 'stable'])
	})

	it('objeto sin properties con additionalProperties es map (require)', () => {
		const requireField = child(root, 'require')
		expect(classifyNode(requireField).kind).toBe('map')
	})

	it('config.policy es union boolean/object', () => {
		const policy = child(child(root, 'config')!, 'policy')
		expect(classifyNode(policy).kind).toBe('union')
		expect(kinds(policy)).toEqual(['boolean', 'object'])
	})

	it('authors resuelve a array de objeto con name requerido', () => {
		const authors = resolveNode(child(root, 'authors')!)
		expect(classifyNode(authors).kind).toBe('array')
		const item = authors.items!
		expect(classifyNode(item).kind).toBe('object')
		expect(item.required).toContain('name')
	})

	it('repositories es union map/array', () => {
		expect(classifyNode(child(root, 'repositories')).kind).toBe('union')
		expect(kinds(child(root, 'repositories'))).toEqual(['map', 'array'])
	})

	it('autoload resuelto: object con psr-0 map', () => {
		const autoload = resolveNode(child(root, 'autoload')!)
		expect(classifyNode(autoload).kind).toBe('object')
		const psr0 = child(autoload, 'psr-0')
		expect(psr0).toBeDefined()
		expect(classifyNode(psr0!).kind).toBe('map')
	})
})

describe('classifyNode · compose-spec', () => {
	const { root } = compileRoot(compose as never)

	it('raíz object y services como map de objetos', () => {
		expect(classifyNode(root).kind).toBe('object')
		const services = child(root, 'services')
		expect(classifyNode(services).kind).toBe('map')
		const pattern = services?.patternProperties?.[0]
		expect(pattern?.name).toBe('^[a-zA-Z0-9._-]+$')
		const value = resolveNode(pattern!.node)
		expect(classifyNode(value).kind).toBe('object')
		expect(Object.keys(value.properties ?? {}).length).toBeGreaterThan(90)
	})

	it('build es union de string/object', () => {
		const services = child(root, 'services')
		const service = resolveNode(services?.patternProperties?.[0]?.node!)
		const build = child(service, 'build')
		expect(classifyNode(build).kind).toBe('union')
		expect(kinds(build)).toEqual(['string', 'object'])
	})

	it('marca deprecated (version)', () => {
		const version = child(root, 'version')
		expect((version?.schema as Record<string, unknown>).deprecated).toBe(true)
	})

	it('include es array de union', () => {
		const include = child(root, 'include')
		expect(classifyNode(include).kind).toBe('array')
		const item = resolveNode(include?.items!)
		expect(classifyNode(item).kind).toBe('union')
		expect(kinds(item)).toEqual(['string', 'object'])
	})
})

describe('variantDefault', () => {
	it('respeta default y required', () => {
		const schema = {
			type: 'object',
			required: ['a', 'b', 'c'],
			properties: {
				a: { type: 'string', default: 'hola' },
				b: { type: 'number' },
				c: { type: 'boolean', default: true },
				d: { type: 'array', items: { type: 'string' } },
				e: { type: 'string', enum: ['x', 'y'] },
			},
		}
		const { root } = compileRoot(schema as never)
		expect(variantDefault(root)).toEqual({ a: 'hola', b: 0, c: true })
	})

	it('construye defaults de un schema real', () => {
		const { root: composerRoot } = compileRoot(composer as never)
		expect(variantDefault(composerRoot)).toEqual({})
		const { root: composeRoot } = compileRoot(compose as never)
		expect(variantDefault(composeRoot)).toEqual({})
	})
})

describe('paths', () => {
	it('set/get/delete con índices de array y claves anidadas', () => {
		const data: Record<string, any> = {}
		setAt(data, 'authors', [])
		setAt(data, 'authors[0].name', 'alice')
		setAt(data, 'authors[1].name', 'bob')
		setAt(data, 'config.platform.php-8.2', '>=8.2')
		expect(getAt(data, 'authors[0].name')).toBe('alice')
		expect(getAt(data, 'authors[1].name')).toBe('bob')
		expect(getAt(data, 'config.platform.php-8.2')).toBe('>=8.2')
		expect(getAt(data, 'missing.path')).toBeUndefined()
		deleteAt(data, 'authors[0]')
		expect(getAt(data, 'authors[0].name')).toBe('bob')
		deleteAt(data, 'config.platform.php-8.2')
		expect(getAt(data, 'config.platform.php-8.2')).toBeUndefined()
	})
})

describe('validateWithJsl', () => {
	it('mapea errores por ruta', () => {
		const { root } = compileRoot(composer as never)
		const result = validateWithJsl(root, { name: 123 })
		expect(result.ok).toBe(false)
		expect(result.errors.name?.[0]).toBe('form.schema_form.errors.type')
	})

	it('valida datos correctos', () => {
		const { root } = compileRoot(composer as never)
		const result = validateWithJsl(root, { name: 'vendor/pkg', license: ['MIT'] })
		expect(result.ok).toBe(true)
	})

	it('valida rutas anidadas en compose', () => {
		const { root } = compileRoot(compose as never)
		const ok = validateWithJsl(root, { services: { web: { image: 'nginx' } } })
		expect(ok.ok).toBe(true)
		const bad = validateWithJsl(root, { services: { web: { image: 5 } } })
		expect(bad.ok).toBe(false)
		expect(bad.errors['services.web.image']).toBeDefined()
	})

	it('valida format email', () => {
		const schema = { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] }
		const { root } = compileRoot(schema as never)
		const ok = validateWithJsl(root, { email: 'a@b.com' })
		expect(ok.ok).toBe(true)
		const bad = validateWithJsl(root, { email: 'nope' })
		expect(bad.ok).toBe(false)
		expect(bad.errors.email?.[0]).toBe('form.schema_form.errors.format_email')
	})
})

describe('schema real · sin explosión', () => {
	it('compila composer sin errores', () => {
		const { root } = compileRoot(composer as never)
		expect(classifyNode(root).kind).toBe('object')
		expect(root.toSchemaNodes().length).toBeGreaterThan(150)
	})
	it('compila compose sin errores', () => {
		const { root } = compileRoot(compose as never)
		expect(classifyNode(root).kind).toBe('object')
		expect(root.toSchemaNodes().length).toBeGreaterThan(400)
	})
	it('soporta arrays de union (include de compose)', () => {
		const { root } = compileRoot(compose as never)
		const include = child(root, 'include')
		expect(classifyNode(include?.items!).kind).toBe('any')
		expect(classifyNode(resolveNode(include?.items!)).kind).toBe('union')
	})
})
