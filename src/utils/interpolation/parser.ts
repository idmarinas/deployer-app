/**
 * Tokenización de plantillas de interpolación.
 *
 * Reglas:
 * - Solo se interpretan expresiones con la forma exacta `{{raíz.ruta}}`.
 * - No se permiten espacios ni tabulaciones dentro de las llaves.
 * - Las raíces desconocidas se dejan literales (Docker/Go, Helm, Jinja...).
 * - Una expresión con espacios cuya versión compacta empezaría por una raíz
 *   conocida se reporta como `invalid_path`: evita pasar al servidor una
 *   expresión que el usuario cree interpolada.
 * - `\{{` escapa la apertura y deja la expresión literal.
 */

import type { InterpolationIssue, InterpolationScope, TemplateReference } from './types'
import { InterpolationError, isInterpolationScope } from './types'

const EXPRESSION_RE = /\{\{([^{}]*)\}\}/g
const PATH_SEGMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const WHITESPACE_RE = /\s/

export interface ParsedTemplate {
	references: TemplateReference[]
	issues: InterpolationIssue[]
}

/** ¿Los backslashes inmediatamente anteriores a `index` son impares? */
function isEscaped(template: string, index: number): boolean {
	let backslashes = 0
	for (let i = index - 1; i >= 0 && template[i] === '\\'; i--) {
		backslashes++
	}

	return backslashes % 2 === 1
}

interface PathParts {
	scope: InterpolationScope
	segments: string[]
}

/** Interpreta una ruta estricta (sin espacios) con raíz conocida. */
function parsePath(value: string): PathParts | null {
	if (WHITESPACE_RE.test(value)) return null

	const segments = value.split('.')
	if (segments.length < 2) return null
	if (!segments.every(segment => PATH_SEGMENT_RE.test(segment))) return null

	const scope = segments[0]!
	if (!isInterpolationScope(scope)) return null

	return { scope, segments }
}

/** Interpreta una ruta ignorando espacios, solo para detectar errores cercanos. */
function parseCompactPath(value: string): PathParts | null {
	const compact = value.replace(/\s+/g, '')

	return parsePath(compact)
}

export function parseTemplate(template: string): ParsedTemplate {
	const references: TemplateReference[] = []
	const issues: InterpolationIssue[] = []

	for (const match of template.matchAll(EXPRESSION_RE)) {
		const start = match.index ?? 0
		const end = start + match[0].length

		// `\{{...}}` → literal, no se interpreta
		if (isEscaped(template, start)) continue

		const inner = match[1] ?? ''
		const parsed = parsePath(inner)

		if (parsed) {
			references.push({
				expression: match[0],
				path: inner,
				scope: parsed.scope,
				segments: parsed.segments,
				start,
				end,
			})
			continue
		}

		// Solo se reportan como error los "casi aciertos" con raíz conocida.
		if (!WHITESPACE_RE.test(inner)) continue

		const compact = parseCompactPath(inner)
		if (!compact) continue

		issues.push(
			new InterpolationError('invalid_path', {
				expression: match[0],
				path: compact.segments.join('.'),
				start,
				end,
				scope: compact.scope,
			}).toIssue(),
		)
	}

	return { references, issues }
}

/**
 * Convierte `\{{` en `{{` (el escape solo afecta a los delimitadores).
 * Se aplica a los fragmentos de texto que no contienen referencias.
 */
export function unescapeTemplate(text: string): string {
	return text.replace(/\\(?=\{\{)/g, '')
}
