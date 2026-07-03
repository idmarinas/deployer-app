<script lang="ts">
import type { CommandResponse, UpdateProjectInput } from '@/types/tauri-types'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { inject, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProjectSchema, type ProjectSchema } from '@/composables/schemas/projects'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'
import { sanitizeNulls } from '@/utils/sanitize'

import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
const project = inject('project') as any
const isEditMode = inject('isEditMode') as any
const reloadProject = inject('reloadProject') as (() => Promise<unknown>) | undefined

const { t } = useI18n()
const toaster = useToaster()
const queryCache = useQueryCache()

const { projectSchema } = useProjectSchema(project.value.id)

const state = ref<any>(sanitizeNulls(project.value))
const form = useTemplateRef<Form<ProjectSchema>>('form')
const isSaving = ref(false)

// Mientras no estemos en edición global, el borrador se mantiene sincronizado
// con el proyecto real (que puede cambiar por ediciones inline puntuales).
watch(project, newProject => {
	if (!isEditMode.value) state.value = sanitizeNulls(newProject)
})

function startEdit() {
	state.value = sanitizeNulls(project.value)
	isEditMode.value = true
}

function cancelEdit() {
	state.value = sanitizeNulls(project.value)
	isEditMode.value = false
}

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
	isSaving.value = true

	// Patch dirty-tracking: solo se envían las claves que realmente cambiaron.
	const patch: Partial<UpdateProjectInput> = {}
	for (const key of Object.keys(event.data) as (keyof ProjectSchema)[]) {
		if (event.data[key] !== (project.value as any)[key]) {
			;(patch as any)[key] = event.data[key]
		}
	}

	if (Object.keys(patch).length === 0) {
		isEditMode.value = false
		isSaving.value = false
		return
	}

	const result = await invoke<CommandResponse>('crud_update_project', {
		id: project.value.id,
		input: patch,
	})

	if (result.success) {
		// `project` viene de un shallowRef (pinia-colada): mutar en profundidad
		// (Object.assign) no dispara reactividad. Recargamos desde la BD para
		// obtener un objeto nuevo y garantizar que la vista se actualiza.
		await reloadProject?.()
		await queryCache.invalidateQueries({ key: ['projects'] })
		toaster.success(
			t('overlays.toast.title.success'),
			t('notifications.projects.updated', { name: patch.name ?? project.value.name }),
		)
		isEditMode.value = false
	} else {
		toaster.error(
			t('overlays.toast.title.error'),
			result.message_key ? t(result.message_key as any, result.message_params) : t('overlays.toast.description.error'),
		)
	}

	isSaving.value = false
}
</script>

<template>
	<div class="mb-4 flex justify-end gap-2">
		<template v-if="isEditMode">
			<UButton
				:icon="ICONS.actions.close"
				color="neutral"
				variant="soft"
				size="sm"
				:disabled="isSaving"
				@click="cancelEdit"
			>
				{{ t('common.actions.cancel') }}
			</UButton>
			<UButton :icon="ICONS.actions.save" size="sm" :loading="isSaving" @click="form?.submit()">
				{{ t('common.actions.save') }}
			</UButton>
		</template>
		<UButton v-else :icon="ICONS.actions.edit" size="sm" variant="soft" @click="startEdit">
			{{ t('common.actions.edit') }}
		</UButton>
	</div>

	<UForm
		v-if="isEditMode"
		ref="form"
		:disabled="isSaving"
		:schema="projectSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<ProjectViewForm v-model="state" />
	</UForm>
	<div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<ProjectViewForm v-model="project" />
	</div>
</template>
