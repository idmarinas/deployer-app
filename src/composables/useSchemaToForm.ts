import type { JsonSchema, SchemaNode } from 'json-schema-library'
import type { Component } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { compileRoot } from '@/utils/schema-form/jsl'
import { deleteAt, getAt, setAt } from '@/utils/schema-form/paths'
import type { MessageResolver } from '@/utils/schema-form/validate'
import { validateWithJsl } from '@/utils/schema-form/validate'

export interface SchemaFormOptions {
	resolveTitle?: (path: string, schema: Record<string, unknown>) => string | undefined
	resolveDescription?: (path: string, schema: Record<string, unknown>) => string | undefined
	resolveMessage?: MessageResolver
	/** Mapa nombre de widget → componente. Los nodos marcados con `x-widget` se renderizan con el componente correspondiente. */
	widgets?: Record<string, Component>
}

export interface SchemaFormInstance {
	root: SchemaNode
	draft: string
	formData: ReturnType<typeof ref<Record<string, any>>>
	errors: ReturnType<typeof ref<Record<string, string[]>>>
	warnings: ReturnType<typeof ref<Record<string, string[]>>>
	validate: () => boolean
	errorAt: (path: string) => string[] | undefined
	warningAt: (path: string) => string[] | undefined
	get: (path: string) => unknown
	set: (path: string, value: unknown) => void
	remove: (path: string) => void
	setData: (data: Record<string, any>) => void
	nodeAt: (pointer: string) => SchemaNode | undefined
	resolveTitle: (path: string, schema: Record<string, unknown>) => string | undefined
	resolveDescription: (path: string, schema: Record<string, unknown>) => string | undefined
	widgets: Record<string, Component>
}

export function useSchemaToForm(schema: JsonSchema, options: SchemaFormOptions = {}): SchemaFormInstance {
	const { root, draft } = compileRoot(schema)
	const { t } = useI18n()

	let initial: Record<string, any> = {}
	try {
		const data = root.getData()
		if (data && typeof data === 'object' && !Array.isArray(data)) initial = data
	} catch {}

	const formData = ref<Record<string, any>>(initial)
	const errors = ref<Record<string, string[]>>({})
	const warnings = ref<Record<string, string[]>>({})

	const resolveMessage: MessageResolver = options.resolveMessage ?? ((key, params) => t(key, params ?? {}))

	function validate(): boolean {
		const result = validateWithJsl(root, formData.value, resolveMessage)
		errors.value = result.errors
		warnings.value = result.warnings
		return result.ok
	}

	function errorAt(path: string): string[] | undefined {
		return errors.value[path]
	}

	function warningAt(path: string): string[] | undefined {
		return warnings.value[path]
	}

	function get(path: string): unknown {
		return getAt(formData.value, path)
	}

	function set(path: string, value: unknown): void {
		setAt(formData.value, path, value)
	}

	function remove(path: string): void {
		deleteAt(formData.value, path)
	}

	function setData(data: Record<string, any>): void {
		formData.value = data
		errors.value = {}
		warnings.value = {}
	}

	function nodeAt(pointer: string): SchemaNode | undefined {
		const result = root.getNode(pointer, formData.value)
		return result.node
	}

	return {
		root,
		draft,
		formData,
		errors,
		warnings,
		validate,
		errorAt,
		warningAt,
		get,
		set,
		remove,
		setData,
		nodeAt,
		resolveTitle: options.resolveTitle ?? (() => undefined),
		resolveDescription:
			options.resolveDescription ??
			((_path, schema) => (typeof schema.description === 'string' ? schema.description : undefined)),
		widgets: options.widgets ?? {},
	}
}
