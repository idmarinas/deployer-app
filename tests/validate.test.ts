import { describe, expect, it } from 'bun:test'

import { compileSchema } from 'json-schema-library'

import { validateWithJsl, type MessageResolver } from '../src/utils/schema-form/validate'

const es: Record<string, string> = {
	'form.schema_form.errors.type': 'Se esperaba {expected}',
	'form.schema_form.errors.required_property': 'Campo obligatorio',
	'form.schema_form.errors.minimum': 'Debe ser mayor o igual a {minimum}',
	'form.schema_form.errors.maximum': 'Debe ser menor o igual a {maximum}',
	'form.schema_form.errors.min_length': 'Longitud mínima de {minLength}',
	'form.schema_form.errors.max_length': 'Longitud máxima de {maxLength}',
	'form.schema_form.errors.pattern': 'No cumple el patrón requerido',
	'form.schema_form.errors.enum': 'Valor no permitido',
	'form.schema_form.errors.one_of': 'No coincide con ningún formato permitido',
	'form.schema_form.errors.unique_items': 'Los elementos deben ser únicos',
	'form.schema_form.errors.multiple_of': 'Debe ser múltiplo de {multipleOf}',
	'form.schema_form.errors.min_items': 'Debe tener al menos {minItems} elementos',
	'form.schema_form.errors.format_email': 'Formato de email inválido',
	'form.schema_form.errors.generic': 'Valor inválido',
	'form.schema_form.warnings.deprecated': 'Propiedad en desuso',
}

const resolver: MessageResolver = (key, params) => {
	const template = es[key] ?? key
	return template.replace(/\{(\w+)\}/g, (_, name) => String((params as any)?.[name] ?? `{${name}}`))
}

describe('validateWithJsl', () => {
	it('devuelve ok cuando los datos son correctos', () => {
		const root = compileSchema({ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] })
		expect(validateWithJsl(root, { name: 'hola' }, resolver).ok).toBe(true)
	})

	it('type-error → ruta y mensaje i18n', () => {
		const root = compileSchema({ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] })
		const result = validateWithJsl(root, { name: 123 }, resolver)
		expect(result.ok).toBe(false)
		expect(result.errors.name).toEqual(['Se esperaba string'])
	})

	it('required-property-error se ancla en el campo hijo', () => {
		const root = compileSchema({ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] })
		const result = validateWithJsl(root, {}, resolver)
		expect(result.errors.name).toEqual(['Campo obligatorio'])
	})

	it('rutas anidadas', () => {
		const root = compileSchema({
			type: 'object',
			properties: { services: { type: 'object', properties: { web: { type: 'object', properties: { image: { type: 'string' } } } } } },
		})
		const result = validateWithJsl(root, { services: { web: { image: 5 } } }, resolver)
		expect(result.errors['services.web.image']).toEqual(['Se esperaba string'])
	})

	it('errores en arrays: pointer con índice', () => {
		const root = compileSchema({ type: 'object', properties: { list: { type: 'array', items: { type: 'string' } } } })
		const result = validateWithJsl(root, { list: [1, 2] }, resolver)
		expect(result.errors['list[0]']).toBeDefined()
		expect(result.errors['list[1]']).toBeDefined()
	})

	it('format email', () => {
		const root = compileSchema({ type: 'object', properties: { email: { type: 'string', format: 'email' } } })
		const ok = validateWithJsl(root, { email: 'a@b.com' }, resolver)
		expect(ok.ok).toBe(true)
		const bad = validateWithJsl(root, { email: 'nope' }, resolver)
		expect(bad.errors.email).toEqual(['Formato de email inválido'])
	})

	it('minimum / maximum / multipleOf', () => {
		const root = compileSchema({ type: 'object', properties: { n: { type: 'number', minimum: 1, maximum: 10, multipleOf: 2 } } })
		expect(validateWithJsl(root, { n: 5 }, resolver).errors.n).toEqual(['Debe ser múltiplo de 2'])
		expect(validateWithJsl(root, { n: 0 }, resolver).errors.n).toEqual(['Debe ser mayor o igual a 1'])
		expect(validateWithJsl(root, { n: 12 }, resolver).errors.n).toEqual(['Debe ser menor o igual a 10'])
	})

	it('minLength / maxLength / pattern', () => {
		const root = compileSchema({ type: 'object', properties: { s: { type: 'string', minLength: 2, maxLength: 4, pattern: '^[a-z]+$' } } })
		expect(validateWithJsl(root, { s: 'a' }, resolver).errors.s).toEqual(['Longitud mínima de 2'])
		expect(validateWithJsl(root, { s: 'abcde' }, resolver).errors.s).toEqual(['Longitud máxima de 4'])
		expect(validateWithJsl(root, { s: 'ABC' }, resolver).errors.s).toEqual(['No cumple el patrón requerido'])
	})

	it('enum / uniqueItems / minItems', () => {
		const root = compileSchema({
			type: 'object',
			properties: {
				color: { enum: ['red', 'green'] },
				nums: { type: 'array', items: { type: 'number' }, uniqueItems: true, minItems: 2 },
			},
		})
		expect(validateWithJsl(root, { color: 'blue' }, resolver).errors.color).toEqual(['Valor no permitido'])
		expect(validateWithJsl(root, { nums: [1, 1] }, resolver).errors['nums[1]']).toEqual(['Los elementos deben ser únicos'])
		expect(validateWithJsl(root, { nums: [1] }, resolver).errors.nums).toEqual(['Debe tener al menos 2 elementos'])
	})

	it('oneOf → one-of-error en la ruta', () => {
		const root = compileSchema({ type: 'object', properties: { build: { oneOf: [{ type: 'string' }, { type: 'boolean' }] } } })
		const result = validateWithJsl(root, { build: 3 }, resolver)
		expect(result.errors.build).toEqual(['No coincide con ningún formato permitido'])
	})

	it('sin resolver, devuelve la clave i18n', () => {
		const root = compileSchema({ type: 'object', properties: { name: { type: 'string' } } })
		expect(validateWithJsl(root, { name: 1 }).errors.name).toEqual(['form.schema_form.errors.type'])
	})

	it('deprecated-warning se agrupa por ruta sin invalidar', () => {
		const root = compileSchema({
			type: 'object',
			properties: {
				name: { type: 'string' },
				old: { type: 'string', deprecated: true },
			},
		})
		const result = validateWithJsl(root, { name: 'x', old: 'v' }, resolver)
		expect(result.ok).toBe(true)
		expect(result.errors).toEqual({})
		expect(result.warnings.old).toEqual(['Propiedad en desuso'])
	})

	it('sin warning no hay entradas de warnings', () => {
		const root = compileSchema({ type: 'object', properties: { name: { type: 'string' } } })
		const result = validateWithJsl(root, { name: 'x' }, resolver)
		expect(result.warnings).toEqual({})
	})

	it('sin resolver, los warnings devuelven la clave i18n', () => {
		const root = compileSchema({ type: 'object', properties: { old: { type: 'string', deprecated: true } } })
		expect(validateWithJsl(root, { old: 'v' }).warnings.old).toEqual(['form.schema_form.warnings.deprecated'])
	})
})
