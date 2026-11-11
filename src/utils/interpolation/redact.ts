/**
 * Utilidades de redacción de secretos.
 *
 * Cualquier valor secreto resuelto para una ejecución debe pasar por
 * `redactSecrets` antes de aparecer en un error, log o mensaje de UI.
 */

import type { InterpolationRoots } from './types'
import { isInterpolationVariable } from './types'

/** Marcador usado en lugar de un valor secreto. */
export const REDACTED_MARKER = '••••••'

/**
 * Sustituye cada valor secreto por `REDACTED_MARKER`.
 *
 * Se ordenan de mayor a menor longitud para que un secreto que contenga a otro
 * no deje restos del más corto.
 */
export function redactSecrets(text: string, secrets: readonly string[]): string {
	if (!text || secrets.length === 0) return text

	const unique = [...new Set(secrets.filter(secret => secret.length > 0))].sort((a, b) => b.length - a.length)

	let result = text
	for (const secret of unique) {
		result = result.split(secret).join(REDACTED_MARKER)
	}

	return result
}

/** Recoge los valores secretos presentes en las raíces de interpolación. */
export function collectSecretValues(roots: InterpolationRoots): string[] {
	const values: string[] = []

	for (const scope of Object.values(roots)) {
		if (!scope) continue

		for (const entry of Object.values(scope)) {
			if (!isInterpolationVariable(entry) || !entry.isSecret) continue
			if (typeof entry.value === 'string' && entry.value.length > 0) {
				values.push(entry.value)
			}
		}
	}

	return values
}
