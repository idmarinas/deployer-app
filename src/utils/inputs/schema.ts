/**
 * Validación del contrato de parámetros de entrada.
 *
 * Los schemas son factories para que la traducción se resuelva al validar y no
 * al importar el módulo. `coerceInputValue` y `validateInputValues` son
 * reutilizados por el runner (plan 2) y por la UI (planes 3 y 4).
 */

import * as z from 'zod'

import { i18n } from '@/i18n'
import { findReferences } from '@/utils/interpolation'

import type { InputFieldDefinition, InputValue } from './types'
import { INPUT_FIELD_TYPES } from './types'

/** Formato admitido para la clave de un input (misma forma que `{{params.<key>}}`). */
export const INPUT_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

/** Máximo de parámetros declarables en un comando. */
export const MAX_INPUT_FIELDS = 20

/** Traductor compatible con `i18n.global.t` (solo las claves de este módulo). */
export type InputTranslator = (key: string, params?: Record<string, string | number>) => string

const translate: InputTranslator = (key, params) =>
	(i18n.global.t as unknown as InputTranslator)(key, params)

function isNumeric(value: string | number): boolean {
	if (typeof value === 'number') return Number.isFinite(value)

	const trimmed = value.trim()

	return trimmed !== '' && Number.isFinite(Number(trimmed))
}

function addIssue(ctx: z.RefinementCtx, path: PropertyKey[], message: string): void {
	ctx.addIssue({ code: 'custom', path, message })
}

function refineDefault(field: InputFieldDefinition, ctx: z.RefinementCtx, t: InputTranslator): void {
	const value = field.default

	if (value === undefined) return

	if (typeof value === 'string') {
		const references = findReferences(value)

		for (const reference of references) {
			if (reference.scope !== 'global') {
				addIssue(
					ctx,
					['default'],
					t('utils.inputs.errors.default_scope', { path: reference.path }),
				)

				return
			}
		}

		if (references.length > 0) {
			if (field.type === 'boolean') {
				addIssue(ctx, ['default'], t('utils.inputs.errors.default_type'))
			}

			return
		}
	}

	switch (field.type) {
		case 'boolean':
			if (typeof value !== 'boolean') {
				addIssue(ctx, ['default'], t('utils.inputs.errors.default_type'))
			}

			break

		case 'number':
			if (typeof value === 'boolean' || !isNumeric(value)) {
				addIssue(ctx, ['default'], t('utils.inputs.errors.default_type'))
			}

			break

		case 'select': {
			const options = field.options ?? []

			if (options.length > 0 && !options.some(option => String(option.value) === String(value))) {
				addIssue(ctx, ['default'], t('utils.inputs.errors.default_type'))
			}

			break
		}

		case 'text':
			if (typeof value === 'boolean') {
				addIssue(ctx, ['default'], t('utils.inputs.errors.default_type'))
			}

			break
	}
}

function refineOptions(field: InputFieldDefinition, ctx: z.RefinementCtx, t: InputTranslator): void {
	if (field.type !== 'select') return

	if (!field.options || field.options.length === 0) {
		addIssue(ctx, ['options'], t('utils.inputs.errors.options_required'))

		return
	}

	const seen = new Set<string>()

	for (const option of field.options) {
		const value = String(option.value)

		if (value.trim() === '') {
			addIssue(ctx, ['options'], t('utils.inputs.errors.option_value_required'))

			return
		}

		if (seen.has(value)) {
			addIssue(ctx, ['options'], t('utils.inputs.errors.option_duplicate', { value }))

			return
		}

		seen.add(value)
	}
}

/** Schema de un parámetro de entrada. */
export function createInputFieldSchema(t: InputTranslator = translate) {
	return z
		.object({
			key: z.string().trim().regex(INPUT_KEY_PATTERN, t('utils.inputs.errors.key_format')),
			label: z.string().trim().min(1, t('utils.inputs.errors.label_required')),
			type: z.enum(INPUT_FIELD_TYPES),
			required: z.boolean().default(false),
			default: z.union([z.string(), z.number(), z.boolean()]).optional(),
			options: z
				.array(
					z.object({
						label: z.string(),
						value: z.union([z.string(), z.number()]),
					}),
				)
				.optional(),
			help: z.string().optional(),
		})
		.superRefine((field, ctx) => {
			refineOptions(field, ctx, t)
			refineDefault(field, ctx, t)
		})
}

/** Schema del array completo de parámetros de un comando. */
export function createInputFieldsSchema(t: InputTranslator = translate) {
	return z
		.array(createInputFieldSchema(t))
		.max(MAX_INPUT_FIELDS, t('utils.inputs.errors.too_many', { max: MAX_INPUT_FIELDS }))
		.superRefine((fields, ctx) => {
			const seen = new Map<string, number>()

			fields.forEach((field, index) => {
				const firstIndex = seen.get(field.key)

				if (firstIndex === undefined) {
					seen.set(field.key, index)
				} else {
					addIssue(
						ctx,
						[index, 'key'],
						t('utils.inputs.errors.key_duplicate', { key: field.key }),
					)
				}
			})
		})
}

export type InputCoercionError = 'invalid_type' | 'invalid_option'

/**
 * Resultado de normalizar un valor de entrada:
 * - `empty`: no hay valor (`undefined`, `null` o cadena vacía).
 * - `ok`: valor coaccionado al tipo del campo.
 * - `invalid`: el valor no encaja con el tipo o con las opciones del `select`.
 */
export type InputCoercion =
	| { status: 'empty' }
	| { status: 'ok'; value: InputValue }
	| { status: 'invalid'; code: InputCoercionError }

/** Normaliza un valor de entrada según el tipo del campo. */
export function coerceInputValue(field: InputFieldDefinition, raw: unknown): InputCoercion {
	if (raw === undefined || raw === null || raw === '') return { status: 'empty' }

	switch (field.type) {
		case 'text':
			return { status: 'ok', value: typeof raw === 'string' ? raw : String(raw) }

		case 'number': {
			const value = typeof raw === 'number' ? raw : Number(String(raw).trim())

			return Number.isFinite(value)
				? { status: 'ok', value }
				: { status: 'invalid', code: 'invalid_type' }
		}

		case 'boolean': {
			if (typeof raw === 'boolean') return { status: 'ok', value: raw }

			const normalized = String(raw).trim().toLowerCase()

			if (normalized === 'true' || normalized === '1') return { status: 'ok', value: true }
			if (normalized === 'false' || normalized === '0') return { status: 'ok', value: false }

			return { status: 'invalid', code: 'invalid_type' }
		}

		case 'select': {
			const option = (field.options ?? []).find(item => String(item.value) === String(raw))

			return option
				? { status: 'ok', value: option.value }
				: { status: 'invalid', code: 'invalid_option' }
		}
	}
}

export type InputValueIssueCode = 'required' | InputCoercionError

/** Claves i18n usadas por los problemas de valores de entrada. */
export type InputValueMessageKey = 'utils.inputs.errors.value_required' | 'utils.inputs.errors.value_invalid'

/** Problema detectado en los valores de una ejecución (para UI y runner). */
export interface InputValueIssue {
	key: string
	code: InputValueIssueCode
	messageKey: InputValueMessageKey
	messageParams: Record<string, string | number>
}

const VALUE_MESSAGE_KEYS: Record<InputValueIssueCode, InputValueMessageKey> = {
	required: 'utils.inputs.errors.value_required',
	invalid_type: 'utils.inputs.errors.value_invalid',
	invalid_option: 'utils.inputs.errors.value_invalid',
}

/**
 * Valida los valores de una ejecución.
 *
 * `required` considera presentes `false` y `0`, y ausentes `undefined`, `null`
 * y la cadena vacía. Los valores presentes se coaccionan para comprobar tipo y
 * opciones; el runner usa `coerceInputValue` para construir `params`.
 */
export function validateInputValues(
	fields: InputFieldDefinition[],
	values: Partial<Record<string, InputValue>>,
): InputValueIssue[] {
	const issues: InputValueIssue[] = []

	for (const field of fields) {
		const raw = values[field.key]

		if (raw === undefined || raw === null || raw === '') {
			if (field.required) {
				issues.push({
					key: field.key,
					code: 'required',
					messageKey: VALUE_MESSAGE_KEYS.required,
					messageParams: { label: field.label },
				})
			}

			continue
		}

		const coercion = coerceInputValue(field, raw)

		if (coercion.status === 'invalid') {
			issues.push({
				key: field.key,
				code: coercion.code,
				messageKey: VALUE_MESSAGE_KEYS[coercion.code],
				messageParams: { label: field.label, type: field.type },
			})
		}
	}

	return issues
}
