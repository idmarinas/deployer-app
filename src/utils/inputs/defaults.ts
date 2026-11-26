/**
 * Resolución de los valores por defecto de los parámetros de entrada.
 *
 * Un `default` puede ser un literal o una plantilla con una o varias
 * expresiones `{{global.<slug>}}`. Solo se aceptan variables globales que
 * existan, estén habilitadas y **no** sean secretas: el valor se muestra en el
 * formulario de ejecución y nunca debe contener un secreto.
 */

import type { GlobalVariableScope } from '@/drizzle/lib/variables'
import type { InputFieldDefinition, InputValues } from './types'

import { findReferences, interpolateString, InterpolationError } from '@/utils/interpolation'
import { coerceInputValue } from './schema'

export type InputDefaultIssueCode = 'unknown' | 'disabled' | 'secret' | 'invalid_type' | 'invalid_option'

/** Claves i18n usadas por los problemas de valores por defecto. */
export type InputDefaultMessageKey =
	| 'utils.inputs.errors.default_unknown'
	| 'utils.inputs.errors.default_disabled'
	| 'utils.inputs.errors.default_secret'
	| 'utils.inputs.errors.default_type'
	| 'utils.inputs.errors.default_scope'

/** Problema detectado al resolver un valor por defecto. */
export interface InputDefaultIssue {
	key: string
	code: InputDefaultIssueCode
	messageKey: InputDefaultMessageKey
	messageParams: Record<string, string | number>
}

/** Valores resueltos y problemas encontrados. */
export interface ResolvedInputDefaults {
	values: InputValues
	issues: InputDefaultIssue[]
}

const MESSAGE_KEYS: Record<InputDefaultIssueCode, InputDefaultMessageKey> = {
	unknown: 'utils.inputs.errors.default_unknown',
	disabled: 'utils.inputs.errors.default_disabled',
	secret: 'utils.inputs.errors.default_secret',
	invalid_type: 'utils.inputs.errors.default_type',
	invalid_option: 'utils.inputs.errors.default_type',
}

/**
 * Aplica los `default` de los campos.
 *
 * No es reactivo: se llama al abrir el diálogo y otra vez en el runner. Las
 * claves sin `default` no aparecen en `values`; el runner las completa con un
 * valor vacío de su tipo.
 */
export function resolveInputDefaults(
	fields: InputFieldDefinition[],
	globalScope: GlobalVariableScope,
): ResolvedInputDefaults {
	const values: InputValues = {}
	const issues: InputDefaultIssue[] = []

	for (const field of fields) {
		const defaultValue = field.default

		if (defaultValue === undefined) continue

		if (field.type === 'boolean') {
			if (typeof defaultValue === 'boolean') {
				values[field.key] = defaultValue
			} else {
				issues.push({
					key: field.key,
					code: 'invalid_type',
					messageKey: MESSAGE_KEYS.invalid_type,
					messageParams: {},
				})
			}

			continue
		}

		let resolved: unknown = defaultValue

		if (typeof defaultValue === 'string') {
			let invalid = false

			for (const reference of findReferences(defaultValue)) {
				if (reference.scope !== 'global') {
					issues.push({
						key: field.key,
						code: 'invalid_type',
						messageKey: 'utils.inputs.errors.default_scope',
						messageParams: { path: reference.path },
					})
					invalid = true

					continue
				}

				const entry = globalScope[reference.segments[1] ?? '']

				if (!entry) {
					issues.push({
						key: field.key,
						code: 'unknown',
						messageKey: MESSAGE_KEYS.unknown,
						messageParams: { path: reference.path },
					})
					invalid = true
				} else if (entry.enabled === false) {
					issues.push({
						key: field.key,
						code: 'disabled',
						messageKey: MESSAGE_KEYS.disabled,
						messageParams: { path: reference.path },
					})
					invalid = true
				} else if (entry.isSecret) {
					issues.push({
						key: field.key,
						code: 'secret',
						messageKey: MESSAGE_KEYS.secret,
						messageParams: { path: reference.path },
					})
					invalid = true
				}
			}

			if (invalid) continue

			try {
				resolved = interpolateString(defaultValue, { global: globalScope })
			} catch (error) {
				if (error instanceof InterpolationError) {
					const code: InputDefaultIssueCode =
						error.code === 'unknown_variable'
							? 'unknown'
							: error.code === 'disabled_variable'
								? 'disabled'
								: error.code === 'secret_variable'
									? 'secret'
									: 'invalid_type'

					issues.push({
						key: field.key,
						code,
						messageKey: MESSAGE_KEYS[code],
						messageParams: error.messageParams,
					})
					continue
				}

				throw error
			}
		}

		const coercion = coerceInputValue(field, resolved)

		if (coercion.status === 'invalid') {
			issues.push({
				key: field.key,
				code: coercion.code,
				messageKey: MESSAGE_KEYS[coercion.code],
				messageParams: {},
			})
		} else if (coercion.status === 'ok') {
			values[field.key] = coercion.value
		}
	}

	return { values, issues }
}
