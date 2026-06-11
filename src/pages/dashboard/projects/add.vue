<script lang="ts">
import type { ProjectSchema } from '@/composables/schemas/projects'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { FormSubmitEvent } from '@nuxt/ui'
import { CommandResponse, CreateProjectInput } from '@/types/tauri-types'
import { useProjectSchema } from '@/composables/schemas/projects'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-projects-add',
})

const { projectSchema } = useProjectSchema()
const { t } = useI18n()

const toolbar = useDashboardToolbar('projects')
const form = useTemplateRef('form')
const initialState: ProjectSchema = {
	name: '',
	description: undefined,
	git_url: '',
	framework: 'symfony',
	enabled: false,
}
const state = ref<any>({ ...initialState })
const isLoading = ref(false)
const toast = useToast()
const router = useRouter()

const handleReset = () => {
	Object.assign(state, initialState)
	form.value?.clear()
}
const updateToolbar = () => toolbar?.setToolbarContent(generateToolbarContent()) // Generar contenido del toolbar
const generateToolbarContent = useToolbarContentCreate(
	'projects',
	state,
	isLoading,
	updateToolbar,
	() => form.value?.submit(),
	handleReset,
)

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
	isLoading.value = true
	const input: Partial<CreateProjectInput> = event.data

	const response = await invoke<CommandResponse<number>>('crud_create_project', { input })

	if (response.success) {
		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.projects.added', { name: input.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-projects' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: response.message_key, color: 'error' })
		isLoading.value = false
	}
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
	updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearToolbarContent()
})

// Actualizar toolbar cuando isLoading cambia
watch(isLoading, updateToolbar)
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		:state="state"
		:schema="projectSchema"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<ProjectForm v-model="state" />
	</UForm>
</template>
