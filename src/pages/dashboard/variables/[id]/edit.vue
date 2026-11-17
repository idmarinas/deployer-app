<script lang="ts">
import type { VariablesValidationUpdateType } from '@/composables/validation/useVariablesValidation'
import type { Variable } from '@/types/entities'

import { Form, FormSubmitEvent } from '@nuxt/ui'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { createToolbarModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useVariableQuery } from '@/composables/queries/variables'
import { useVariablesValidation } from '@/composables/validation/useVariablesValidation'
import { loadVariableById } from '@/loaders/variables'
import { ModulesName } from '@/utils/deployer-app'
import { sanitizeNulls } from '@/utils/sanitize'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/variables/:id(\\d+)/edit',
	name: 'dashboard-variables-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const route = useRoute('dashboard-variables-id-edit')
const router = useRouter()
const variableSchema = useVariablesValidation(Number.parseInt(route.params.id))
const variableQuery = useVariableQuery()
const { toolbar } = createToolbarModule(ModulesName.Variables)
const { data: entityData, isLoading, reload, status } = loadVariableById()

// `Variable` tiene una propiedad `value: string` que encaja con `NavigationResult`
// de vue-router, así que el loader infiere el tipo como `never`. Recuperamos el tipo real.
const entity = computed(() => entityData.value as Variable | undefined)

const state = ref<any>({})
const form = useTemplateRef<Form<VariablesValidationUpdateType>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, entity, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<VariablesValidationUpdateType>) {
	isLoading.value = true

	await variableQuery
		.update(Number.parseInt(route.params.id), event.data as any)
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
	reload()
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(
	entity,
	async newEntity => {
		if (newEntity) {
			state.value = sanitizeNulls(newEntity)
		}
	},
	{ immediate: true },
)

// Si el registro no existe, vuelve al listado en lugar de mostrar un formulario vacío.
watch([status, entityData], ([currentStatus, value]) => {
	if (currentStatus === 'success' && !value) {
		void router.replace({ name: 'dashboard-variables' })
	}
})

watch(isLoading, () => {
	toolbar?.updateToolbar()
})
</script>

<template>
	<UForm
		ref="form"
		id="form-variable-edit"
		:disabled="isLoading"
		:schema="variableSchema.update"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<VariablesForm v-model="state" :is-secret="entity?.is_secret || false" :is-edit="true" />
	</UForm>
</template>
