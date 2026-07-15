<script setup lang="ts">
import type { CommandResponse, CreateGlobalVariableInput } from '@/types/tauri-types'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useGlobalVariableSchema, type GlobalVariableSchema } from '@/composables/schemas/global_variables'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'

definePage({
	name: 'dashboard-global_variables-add',
})

const { t } = useI18n()
const router = useRouter()
const toolbar = useDashboardToolbar('global_variables')

const toast = useToast()
const { globalVariableSchema } = useGlobalVariableSchema()

const initialState: GlobalVariableSchema = {
	name: '',
	slug: '',
	value: '',
	data_type: 'string',
	is_secret: false,
	description: undefined,
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<GlobalVariableSchema>>('form')
const isLoading = ref(false)
const queryCache = useQueryCache()

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<GlobalVariableSchema>) {
	isLoading.value = true
	const input: Partial<CreateGlobalVariableInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_create_global_variable', { input })

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['variables'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.global_variables.added', { name: input.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-global_variables' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
		isLoading.value = false
	}
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
		id="form-global-variable-create"
		:schema="globalVariableSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<GlobalVariableForm v-model="state" />
	</UForm>
</template>
