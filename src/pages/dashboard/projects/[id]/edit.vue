<script lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { useProjectById } from '@/loaders/projects'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useProjectSchema, type ProjectSchema } from '@/composables/schemas/projects'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { CommandResponse, UpdateProjectInput } from '@/types/tauri-types'
import { sanitizeNulls } from '@/utils/sanitize'
import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/projects/:id(\\d+)/edit',
	name: 'dashboard-projects-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-projects-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('projects')
const toast = useToast()
const { data: project, isLoading, reload } = useProjectById()
const { projectSchema } = useProjectSchema(Number.parseInt(route.params.id))

const state = ref<any>({})
const isSaving = ref(false)
const form = useTemplateRef<Form<ProjectSchema>>('form')
const queryCache = useQueryCache()

// Generar contenido del toolbar
useToolbarContentEdit(state, project, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
	isLoading.value = true
	isSaving.value = true
	const project: Partial<UpdateProjectInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_project', {
		id: Number.parseInt(route.params.id),
		input: project,
	})

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['projects'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.projects.updated', { name: project.name }),
			color: 'success',
		})
		isLoading.value = false
		isSaving.value = false
		router.push({ name: 'dashboard-projects' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
		isLoading.value = false
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
	project,
	newProject => {
		if (newProject) {
			state.value = sanitizeNulls(newProject)
		}
	},
	{ immediate: true },
)

watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<Loading v-if="isLoading && !isSaving" what="project" />
	<UForm
		v-else
		ref="form"
		:disabled="isLoading"
		id="form-project-edit"
		:schema="projectSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<ProjectForm v-model="state" />
	</UForm>
</template>
