/**
 * Resolución de plantillas de interpolación.
 *
 * `interpolateString` resuelve en modo ejecución (lanza `InterpolationError`),
 * mientras que `validateTemplate` devuelve problemas con posición para el
 * linter y el preview sin lanzar.
 */

import { parseTemplate, unescapeTemplate } from './parser'
import { REDACTED_MARKER } from './redact'
import type {
	InterpolationIssue,
	InterpolationOptions,
	InterpolationRoots,
	InterpolationSegment,
	TemplateReference,
} from './types'
import { InterpolationError, isInterpolationVariable } from './types'

function createError(code: InterpolationError['code'], ref: TemplateReference): InterpolationError {
	return new InterpolationError(code, {
		expression: ref.expression,
		path: ref.path,
		start: ref.start,
		end: ref.end,
		scope: ref.scope,
	})
}

function issueToError(issue: InterpolationIssue): InterpolationError {
	return new InterpolationError(issue.code, {
		expression: issue.expression,
		path: issue.path,
		start: issue.start,
		end: issue.end,
	})
}

/** Resuelve una entrada del ámbito `global` aplicando las reglas de secreto. */
function resolveGlobalVariable(entry: unknown, ref: TemplateReference, options: InterpolationOptions): unknown {
	if (!isInterpolationVariable(entry)) return entry

	if (entry.enabled === false) {
		throw createError('disabled_variable', ref)
	}

	if (entry.isSecret) {
		if (options.maskSecrets === false) return entry.value

		return options.secretPlaceholder ?? REDACTED_MARKER
	}

	return entry.value
}

function resolveReference(ref: TemplateReference, roots: InterpolationRoots, options: InterpolationOptions): unknown {
	const scopeValues = roots[ref.scope]
	if (!scopeValues) {
		throw createError('scope_not_available', ref)
	}

	const segments = ref.segments.slice(1)

	if (ref.scope === 'global') {
		if (segments.length !== 1) {
			throw createError('invalid_path', ref)
		}

		return resolveGlobalVariable(scopeValues[segments[0]!], ref, options)
	}

	let current: unknown = scopeValues
	for (const segment of segments) {
		if (current === null || typeof current !== 'object' || !(segment in current)) {
			throw createError('unknown_variable', ref)
		}

		current = (current as Record<string, unknown>)[segment]
	}

	return current
}

function checkReference(ref: TemplateReference, roots: InterpolationRoots): InterpolationIssue | null {
	const scopeValues = roots[ref.scope]
	if (!scopeValues) {
		return createError('scope_not_available', ref).toIssue()
	}

	const segments = ref.segments.slice(1)

	if (ref.scope === 'global') {
		if (segments.length !== 1) {
			return createError('invalid_path', ref).toIssue()
		}

		const entry = scopeValues[segments[0]!]
		if (entry === undefined) {
			return createError('unknown_variable', ref).toIssue()
		}

		if (!isInterpolationVariable(entry)) return null
		if (entry.enabled === false) return createError('disabled_variable', ref).toIssue()
		if (entry.isSecret) {
			return {
				...createError('secret_variable', ref).toIssue(),
				severity: 'warning',
				messageKey: 'utils.interpolation.warnings.secret_variable',
			}
		}

		return null
	}

	let current: unknown = scopeValues
	for (const segment of segments) {
		if (current === null || typeof current !== 'object' || !(segment in current)) {
			return createError('unknown_variable', ref).toIssue()
		}

		current = (current as Record<string, unknown>)[segment]
	}

	return null
}

function stringify(value: unknown): string {
	if (value === null || value === undefined) return ''
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value)
	}

	return JSON.stringify(value) ?? String(value)
}

/** ¿La referencia apunta a una variable secreta del ámbito `global`? */
function isSecretReference(ref: TemplateReference, roots: InterpolationRoots): boolean {
	if (ref.scope !== 'global') return false

	const entry = roots.global?.[ref.segments[1] ?? '']

	return isInterpolationVariable(entry) && entry.isSecret === true
}

/**
 * Resuelve todas las referencias de una plantilla en fragmentos de texto y
 * referencias.
 *
 * Misma semántica que `interpolateString`, pero conserva la expresión original
 * de cada referencia para que la UI pueda mostrar la plantilla guardada y la
 * resuelta resaltando lo que se ha interpolado.
 *
 * Lanza `InterpolationError` si alguna referencia es inválida, no existe, está
 * deshabilitada o pertenece a un ámbito no disponible. Las expresiones con
 * raíces desconocidas se conservan literales.
 */
export function interpolateSegments(
	template: string,
	roots: InterpolationRoots,
	options: InterpolationOptions = {},
): InterpolationSegment[] {
	const { references, issues } = parseTemplate(template)
	if (issues.length > 0) {
		throw issueToError(issues[0]!)
	}

	const segments: InterpolationSegment[] = []
	let cursor = 0

	for (const ref of references) {
		const literal = unescapeTemplate(template.slice(cursor, ref.start))
		if (literal) segments.push({ kind: 'text', text: literal })

		segments.push({
			kind: 'reference',
			expression: ref.expression,
			text: stringify(resolveReference(ref, roots, options)),
			path: ref.path,
			scope: ref.scope,
			isSecret: isSecretReference(ref, roots),
		})
		cursor = ref.end
	}

	const rest = unescapeTemplate(template.slice(cursor))
	if (rest) segments.push({ kind: 'text', text: rest })

	return segments
}

/**
 * Resuelve todas las referencias de una plantilla.
 *
 * Lanza `InterpolationError` si alguna referencia es inválida, no existe, está
 * deshabilitada o pertenece a un ámbito no disponible. Las expresiones con
 * raíces desconocidas se conservan literales.
 */
export function interpolateString(
	template: string,
	roots: InterpolationRoots,
	options: InterpolationOptions = {},
): string {
	return interpolateSegments(template, roots, options)
		.map(segment => segment.text)
		.join('')
}

/**
 * Resuelve un valor arbitrario.
 *
 * Si el string completo es una única referencia, conserva el tipo original del
 * valor (necesario para el futuro motor de workflows). Si está embebida en
 * texto, devuelve string.
 */
export function interpolateValue(
	value: unknown,
	roots: InterpolationRoots,
	options: InterpolationOptions = {},
): unknown {
	if (typeof value === 'string') {
		const { references, issues } = parseTemplate(value)
		if (issues.length > 0) {
			throw issueToError(issues[0]!)
		}

		const single = references.length === 1 ? references[0]! : null
		if (single && single.start === 0 && single.end === value.length) {
			return resolveReference(single, roots, options)
		}

		return interpolateString(value, roots, options)
	}

	if (Array.isArray(value)) {
		return value.map(item => interpolateValue(item, roots, options))
	}

	if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {}
		for (const [key, child] of Object.entries(value)) {
			result[key] = interpolateValue(child, roots, options)
		}

		return result
	}

	return value
}

/** Devuelve las referencias válidas de una plantilla (para UI y linter). */
export function findReferences(template: string): TemplateReference[] {
	return parseTemplate(template).references
}

/**
 * Valida una plantilla contra las raíces disponibles.
 *
 * Devuelve las referencias inválidas con su posición y un `messageKey` i18n.
 * Las secretas se reportan como aviso (`warning`), no como error.
 */
export function validateTemplate(template: string, roots: InterpolationRoots): InterpolationIssue[] {
	const { references, issues } = parseTemplate(template)
	const result: InterpolationIssue[] = [...issues]

	for (const ref of references) {
		const issue = checkReference(ref, roots)
		if (issue) result.push(issue)
	}

	return result.sort((a, b) => a.start - b.start)
}
