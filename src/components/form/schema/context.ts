import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

import type { SchemaFormInstance } from '@/composables/useSchemaForm'

export const schemaFormContextKey: InjectionKey<SchemaFormInstance> = Symbol('schema-form')

export function provideSchemaFormContext(form: SchemaFormInstance): void {
	provide(schemaFormContextKey, form)
}

export function useSchemaFormContext(): SchemaFormInstance {
	const form = inject(schemaFormContextKey)
	if (!form) throw new Error('useSchemaFormContext solo puede usarse dentro de un proveedor SchemaForm')
	return form
}
