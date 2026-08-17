import type { SchemaNode } from 'json-schema-library'

import { pointerToPath } from './paths'

export interface ValidationResult {
	ok: boolean
	errors: Record<string, string[]>
	warnings: Record<string, string[]>
}

export type MessageResolver = (key: string, params?: Record<string, unknown>) => string

/** Mapea el código de error de jsl a la clave i18n bajo `form.schema_form.errors.*`. */
const ERROR_KEY_BY_CODE: Record<string, string> = {
	'type-error': 'type',
	'required-property-error': 'required_property',
	'const-error': 'const',
	'enum-error': 'enum',
	'minimum-error': 'minimum',
	'maximum-error': 'maximum',
	'exclusive-minimum-error': 'exclusive_minimum',
	'exclusive-maximum-error': 'exclusive_maximum',
	'multiple-of-error': 'multiple_of',
	'min-length-error': 'min_length',
	'min-length-one-error': 'min_length_one',
	'max-length-error': 'max_length',
	'min-items-error': 'min_items',
	'min-items-one-error': 'min_items_one',
	'max-items-error': 'max_items',
	'unique-items-error': 'unique_items',
	'pattern-error': 'pattern',
	'pattern-properties-error': 'pattern_properties',
	'one-of-error': 'one_of',
	'any-of-error': 'any_of',
	'all-of-error': 'all_of',
	'format-email-error': 'format_email',
	'format-uri-error': 'format_uri',
	'format-url-error': 'format_url',
	'format-uuid-error': 'format_uuid',
	'format-date-error': 'format_date',
	'format-date-time-error': 'format_date_time',
	'format-time-error': 'format_time',
	'format-duration-error': 'format_duration',
	'format-hostname-error': 'format_hostname',
	'format-ipv4-error': 'format_ipv4',
	'format-ipv6-error': 'format_ipv6',
	'format-regex-error': 'format_regex',
	'format-json-pointer-error': 'format_json_pointer',
	'format-iri-error': 'format_iri',
	'format-iri-reference-error': 'format_iri_reference',
	'format-uri-reference-error': 'format_uri_reference',
	'format-uri-template-error': 'format_uri_template',
	'additional-properties-error': 'additional_properties',
	'no-additional-properties-error': 'additional_properties',
	'forbidden-property-error': 'forbidden_property',
	'invalid-property-name-error': 'invalid_property_name',
	'missing-dependency-error': 'missing_dependency',
	'undefined-value-error': 'undefined_value',
	'value-not-empty-error': 'value_not_empty',
	'multiple-one-of-error': 'multiple_one_of',
	'min-properties-error': 'min_properties',
	'max-properties-error': 'max_properties',
}

const PARAM_KEYS = [
	'key',
	'value',
	'expected',
	'received',
	'minimum',
	'maximum',
	'minLength',
	'maxLength',
	'minItems',
	'maxItems',
	'multipleOf',
	'property',
	'missingProperty',
	'pattern',
	'values',
	'length',
	'delta',
	'pointer',
] as const

/** Mapea el código de warning (annotation) de jsl a la clave i18n bajo `form.schema_form.warnings.*`. */
const WARNING_KEY_BY_CODE: Record<string, string> = {
	'deprecated-warning': 'deprecated',
	'unknown-keyword-warning': 'unknown_keyword',
	'unknown-format-warning': 'unknown_format',
	'schema-warning': 'schema',
}

function paramsOf(error: { data?: unknown }): Record<string, unknown> {
	const data = (error.data ?? {}) as Record<string, unknown>
	const out: Record<string, unknown> = {}
	for (const key of PARAM_KEYS) {
		if (data[key] !== undefined) out[key] = data[key]
	}
	return out
}

function errorPath(error: { code?: unknown; data?: { pointer?: unknown; key?: unknown; missingProperty?: unknown } }): string {
	const pointer = typeof error.data?.pointer === 'string' ? error.data.pointer : ''
	let path = pointerToPath(pointer)
	const key = error.data?.key
	if (error.code === 'required-property-error' && typeof key === 'string') {
		path = path ? `${path}.${key}` : key
	} else if (error.code === 'missing-dependency-error' && typeof error.data?.missingProperty === 'string') {
		const prop = error.data.missingProperty
		path = path ? `${path}.${prop}` : prop
	}
	return path
}

/**
 * Valida datos con el nodo raíz compilado de jsl y agrupa los errores y warnings
 * por ruta de formulario. El mensaje se resuelve con `resolveMessage` a partir de
 * la clave i18n `form.schema_form.errors.<código>` / `form.schema_form.warnings.<código>`;
 * si no se provee resolver, se devuelve la propia clave i18n.
 */
export function validateWithJsl(root: SchemaNode, data: unknown, resolveMessage?: MessageResolver): ValidationResult {
	const result = root.validate(data)

	const errors: Record<string, string[]> = {}
	for (const error of result.errors) {
		const path = errorPath(error)
		if (!errors[path]) errors[path] = []
		const i18nKey = ERROR_KEY_BY_CODE[String(error.code)] ?? 'generic'
		const message = resolveMessage ? resolveMessage(`form.schema_form.errors.${i18nKey}`, paramsOf(error)) : `form.schema_form.errors.${i18nKey}`
		errors[path].push(message)
	}

	const warnings: Record<string, string[]> = {}
	for (const annotation of result.annotations) {
		const code = String(annotation.code)
		if (!code.endsWith('-warning')) continue
		const path = errorPath(annotation)
		if (!warnings[path]) warnings[path] = []
		const i18nKey = WARNING_KEY_BY_CODE[code] ?? 'generic'
		const message = resolveMessage
			? resolveMessage(`form.schema_form.warnings.${i18nKey}`, paramsOf(annotation))
			: `form.schema_form.warnings.${i18nKey}`
		warnings[path].push(message)
	}

	return { ok: result.errors.length === 0, errors, warnings }
}
