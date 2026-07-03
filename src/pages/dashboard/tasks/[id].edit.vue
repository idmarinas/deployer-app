<script lang="ts">
import { useTaskById } from '@/loaders/tasks'
import { watch, ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useQueryCache } from '@pinia/colada'
import { useTaskSchema, type TaskSchema } from '@/composables/schemas/tasks'
import { sanitizeNulls } from '@/utils/sanitize'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { CommandResponse, UpdateTaskInput } from '@/types/tauri-types'
import { Form, FormSubmitEvent } from '@nuxt/ui'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/tasks/:id(\\d+)/edit',
	name: 'dashboard-tasks-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-tasks-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('tasks')
const toast = useToast()
const { data: task, isLoading, reload } = useTaskById()
const { taskSchema } = useTaskSchema(Number.parseInt(route.params.id))

const queryCache = useQueryCache()

const state = ref<any>({})
const form = useTemplateRef<Form<TaskSchema>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, task, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<TaskSchema>) {
	isLoading.value = true
	const task: Partial<UpdateTaskInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_task', {
		id: Number.parseInt(route.params.id),
		input: task,
	})

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['tasks'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.tasks.updated', { name: task.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-tasks' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
		isLoading.value = false
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
	task,
	newTask => {
		if (newTask) {
			// La entidad Task expone el campo `type`, pero los comandos de creación/edición
			// (y el schema) usan `task_type` — se mapea aquí al cargar el borrador.
			const { type, ...rest } = sanitizeNulls(newTask)
			state.value = { ...rest, task_type: type }
		}
	},
	{ immediate: true },
)

watch(isLoading, () => {
	toolbar?.updateToolbar()
})
</script>

<template>
	<USkeleton v-if="isLoading" class="size-9 rounded-full" />
	<div v-else class="flex flex-col gap-6">
		<UForm
			ref="form"
			:disabled="isLoading"
			id="form-task-edit"
			:schema="taskSchema"
			:state="state"
			class="grid grid-cols-1 md:grid-cols-2 gap-4"
			@submit="onSubmit"
		>
			<TaskForm v-model="state" :is-loading="isLoading" />
		</UForm>

		<TaskDependencies :task-id="Number.parseInt(route.params.id)" />
	</div>
</template>
