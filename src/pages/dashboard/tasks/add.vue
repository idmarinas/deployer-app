<script setup lang="ts">
import type { CommandResponse, CreateTaskInput } from '@/types/tauri-types'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useTaskSchema, type TaskSchema } from '@/composables/schemas/tasks'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'

definePage({
	name: 'dashboard-tasks-add',
})

const { t } = useI18n()
const router = useRouter()
const toolbar = useDashboardToolbar('tasks')

const toast = useToast()
const { taskSchema } = useTaskSchema()

const initialState: TaskSchema = {
	name: '',
	description: undefined,
	task_type: 'command',
	command: '',
	timeout: 300,
	retry_count: 0,
	retry_delay: 5,
	enabled: false,
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<TaskSchema>>('form')
const isLoading = ref(false)
const queryCache = useQueryCache()

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<TaskSchema>) {
	isLoading.value = true
	const task: Partial<CreateTaskInput> = { ...event.data, is_global: true }

	const result = await invoke<CommandResponse<number>>('crud_create_task', { input: task })

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['tasks'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.tasks.added', { name: task.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-tasks' })
	} else {
		console.log(result)
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t(result.message_key, result.message_params),
			color: 'error',
		})
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
		id="form-task-create"
		:schema="taskSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<TaskForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
