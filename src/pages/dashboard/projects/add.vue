<script lang="ts">
import type { ProjectSchema } from '@/composables/schemas/projects'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useProjectSchema } from '@/composables/schemas/projects'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { CommandResponse, CreateProjectInput } from '@/types/tauri-types'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-projects-add',
})

const { projectSchema } = useProjectSchema()
const { t } = useI18n()

const queryCache = useQueryCache()
const toolbar = useDashboardToolbar('projects')
const form = useTemplateRef<Form<ProjectSchema>>('form')
const initialState: ProjectSchema = {
	name: '',
	description: undefined,
	git_url: '',
	local_working_dir: '',
	remote_working_dir: '',
	framework: 'symfony',
	enabled: false,
}
const state = ref<any>({ ...initialState })
const isLoading = ref(false)
const toast = useToast()
const router = useRouter()

useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
	isLoading.value = true
	const input: Partial<CreateProjectInput> = event.data

	const response = await invoke<CommandResponse<number>>('crud_create_project', { input })

	if (response.success) {
		await queryCache.invalidateQueries({ key: ['projects'] })
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
		:state="state"
		:schema="projectSchema"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<ProjectForm v-model="state" />
	</UForm>
</template>
