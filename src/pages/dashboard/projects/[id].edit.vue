<script lang="ts">
import { useProjectById } from '@/loaders/projects'
import { watch, ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useProjectSchema, type ProjectSchema } from '@/composables/schemas/projects'
import { sanitizeNulls } from '@/utils/sanitize'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { CommandResponse, UpdateProjectInput } from '@/types/tauri-types'
import { FormSubmitEvent } from '@nuxt/ui'
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
const form = useTemplateRef('form')

const updateToolbar = () => toolbar?.setToolbarContent(generateToolbarContent())
// Generar contenido del toolbar
const generateToolbarContent = useToolbarContentEdit(
	'projects',
	state,
	isLoading,
	updateToolbar,
	() => form.value?.submit(),
	() => {
		if (project.value) {
			state.value = sanitizeNulls(project.value)
		}
		form.value?.clear()
	},
)

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
	isLoading.value = true
	isSaving.value = true
	const project: Partial<UpdateProjectInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_project', {
		id: Number.parseInt(route.params.id),
		input: project,
	})

	if (result.success) {
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
	updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearToolbarContent()
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

watch(isLoading, () => {
	updateToolbar()
})
</script>

<template>
	<!-- Tener en cuenta si se esta cargando los datos o se está guardando las modificaciones -->
	<!-- Esto puede ayudar a distinguir si estamos cargando o guardando datos -->
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
		<ProjectForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
