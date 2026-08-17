import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

import type { SchemaFormInstance } from '@/composables/useSchemaToForm'

export const schemaFormContextKey: InjectionKey<SchemaFormInstance> = Symbol('schema-form')

export function provideSchemaFormContext(form: SchemaFormInstance): void {
	provide(schemaFormContextKey, form)
}

export function useSchemaToFormContext(): SchemaFormInstance {
	const form = inject(schemaFormContextKey)
	if (!form) throw new Error('useSchemaToFormContext solo puede usarse dentro de un proveedor SchemaForm')
	return form
}
