<script lang="ts">
import type { VariablesValidationInsertType } from '@/composables/validation/useVariablesValidation'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { createToolbarModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useVariableQuery } from '@/composables/queries/variables'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { ModulesName } from '@/utils/deployer-app'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-variables-add',
})

const router = useRouter()
const { toolbar } = createToolbarModule(ModulesName.Variables)

const { variables: variablesSchema } = useSchemaValidation()

const initialState: VariablesValidationInsertType = {
	name: '',
	slug: '',
	description: { type: 'doc', content: [{ type: 'paragraph' }] },
	value: '',
	enabled: false,
	is_secret: false,
	updated_at: '',
	created_at: '',
	deleted_at: null,
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<VariablesValidationInsertType>>('form')
const isLoading = ref(false)
const itemQuery = useVariableQuery()

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<VariablesValidationInsertType>) {
	isLoading.value = true

	await itemQuery
		.create(event.data as any)
		.then(async result => {
			if (result !== undefined) {
				await router.push({ name: 'dashboard-variables' })
			}
		})
		.finally(() => {
			isLoading.value = false
		})
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

// Actualizar toolbar cuando isLoading cambia
watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		id="form-variable-create"
		:schema="variablesSchema.insert"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<VariablesForm v-model="state" />
	</UForm>
</template>
