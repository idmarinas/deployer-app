<script lang="ts">
import { useGlobalVariableById } from '@/loaders/global_variables'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useGlobalVariableSchema, type GlobalVariableSchema } from '@/composables/schemas/global_variables'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { CommandResponse, UpdateGlobalVariableInput } from '@/types/tauri-types'
import { sanitizeNulls } from '@/utils/sanitize'
import { Form, FormSubmitEvent } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/global_variables/:id(\\d+)/edit',
	name: 'dashboard-global_variables-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-global_variables-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('global_variables')
const toast = useToast()
const { data: entity, isLoading, reload } = useGlobalVariableById()
const { globalVariableSchema } = useGlobalVariableSchema(Number.parseInt(route.params.id))

const queryCache = useQueryCache()

const isSaving = ref(false)
const state = ref<any>({})
const form = useTemplateRef<Form<GlobalVariableSchema>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, entity, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<GlobalVariableSchema>) {
	isSaving.value = true
	const input: Partial<UpdateGlobalVariableInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_global_variable', {
		id: Number.parseInt(route.params.id),
		input,
	})

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['global_variables'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.global_variables.updated', { name: input.name }),
			color: 'success',
		})
		isSaving.value = false
		router.push({ name: 'dashboard-global_variables' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
		isSaving.value = false
	}
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

watch(isLoading, () => {
	toolbar?.updateToolbar()
})
</script>

<template>
	<USkeleton v-if="isLoading && !isSaving" class="size-9 rounded-full" />
	<UForm
		v-else
		ref="form"
		:disabled="isSaving"
		id="form-global_variable-edit"
		:schema="globalVariableSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<GlobalVariableForm v-model="state" />
	</UForm>
</template>
