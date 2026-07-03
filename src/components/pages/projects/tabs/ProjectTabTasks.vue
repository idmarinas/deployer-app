<!--
	Tab "Tasks" del detalle de proyecto: gestiona la relación N:M project_tasks.

	Sigue exactamente el mismo patrón que ProjectTabHosts.vue: no depende del
	`isEditMode` global, y cada mutación reasigna `project.value` COMPLETO
	(spread) en vez de mutar en profundidad o llamar a un `reload()` que
	vuelve a consultar toda la BD (eso es lo que se percibía como "recarga
	de la página" — ver AGENTS.frontend.md §7c). `project` viene de un
	shallowRef (pinia-colada): solo reasignar `.value` entero dispara
	reactividad; una consulta de recarga completa también lo hace, pero de
	forma mucho más lenta y perceptible que reasignar con los datos que ya
	tenemos en memoria + el registro puntual que acabamos de crear/tocar.
-->
<script lang="ts">
import type { ProjectRow, ProjectTaskRow } from '@/composables/queries/projects'
import type { CommandResponse, TaskConfig } from '@/types/tauri-types'
import type { Ref } from 'vue'

import { useSortable } from '@vueuse/integrations/useSortable'
import { computed, inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProjectQuery } from '@/composables/queries/projects'
import { useConfirmDialog } from '@/composables/useDialog'
import useToaster from '@/composables/useToaster'
import { useTaskSelectPopulate } from '@/loaders/tasks'
import { getModuleIcon, ICONS } from '@/utils/icons'

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
</script>

<script setup lang="ts">
const project = inject<Ref<ProjectRow>>('project')!

const { t } = useI18n()
const toaster = useToaster()
const confirmDialog = useConfirmDialog()

const { data: tasksCatalog } = useTaskSelectPopulate()

const isAdding = ref(false)
const isSaving = ref(false)
const newTaskId = ref<number | null>(null)

const sortableContainer = useTemplateRef('sortable-container')

useSortable(sortableContainer, project.value.project_tasks, {
	handle: '.handle',
	animation: 150,
	watchElement: true,
	// WebView2/WebKit embebidos (Tauri) no disparan bien los eventos nativos de
	// HTML5 Drag & Drop que usa Sortable.js por defecto: sin esto, el drag no
	// arranca en ningún caso (sin error, simplemente no pasa nada).
	forceFallback: true,
	onUpdate: async event => {
		// Sortable.js mueve el elemento en el DOM, pero no reordena el array
		// automáticamente al sobrescribir `onUpdate`. Reordenar nosotros mismos
		// con oldIndex/newIndex antes de recalcular y persistir `order_execution`.
		const { oldIndex, newIndex } = event
		if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

		const reordered = project.value.project_tasks
		const [moved] = reordered.splice(oldIndex, 1)
		reordered.splice(newIndex, 0, moved)

		const updatePromises: Promise<unknown>[] = []

		reordered.forEach((item, idx) => {
			if (item.order_execution !== idx) {
				item.order_execution = idx
				updatePromises.push(
					invoke<CommandResponse>('crud_update_project_task', {
						id: item.id,
						input: { order_execution: idx },
					}),
				)
			}
		})

		project.value = {
			...project.value,
			project_tasks: reordered,
		}

		try {
			await Promise.all(updatePromises)
		} catch (error) {
			console.error('Error updating order_execution:', error)
			toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
		}
	},
})

const assignedIds = computed(() => new Set(project.value.project_tasks.map(pt => pt.task_id)))

function isFileTransferTask(projectTask: ProjectTaskRow) {
	return projectTask.task.type === 'upload_file' || projectTask.task.type === 'download_file'
}

function startAdd() {
	newTaskId.value = null
	isAdding.value = true
}

function cancelAdd() {
	isAdding.value = false
}

async function confirmAdd() {
	if (!newTaskId.value) return

	isSaving.value = true

	const result = await invoke<CommandResponse<number>>('crud_create_project_task', {
		input: {
			project_id: project.value.id,
			task_id: newTaskId.value,
			order_execution: project.value.project_tasks.length,
			enabled: true,
		},
	})

	if (result.success && result.data) {
		const { findProjectTaskById } = useProjectQuery()
		const newProjectTask = await findProjectTaskById(result.data)

		project.value = {
			...project.value,
			project_tasks: [...project.value.project_tasks, newProjectTask!],
		}

		toaster.success(t('overlays.toast.title.success'), t('notifications.project_tasks.added'))
		isAdding.value = false
	} else {
		toaster.error(
			t('overlays.toast.title.error'),
			result.message_key ? t(result.message_key as any, result.message_params) : t('overlays.toast.description.error'),
		)
	}

	isSaving.value = false
}

async function removeTask(projectTask: ProjectTaskRow) {
	const confirmed = await confirmDialog({
		type: 'cancel_delete',
		title: t('common.confirm.delete.label'),
		description: t('common.confirm.delete.description', { name: projectTask.task.name ?? `ID ${projectTask.task_id}` }),
	})

	if (!confirmed) return

	const result = await invoke<CommandResponse>('crud_delete_project_task', { id: projectTask.id })

	if (result.success) {
		project.value = {
			...project.value,
			project_tasks: project.value.project_tasks.filter(pt => pt.id !== projectTask.id),
		}
		toaster.success(t('overlays.toast.title.success'), t('notifications.project_tasks.deleted'))
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}
}

// --- Panel de ajustes avanzados por asignación ---

const expandedId = ref<number | null>(null)
const isSavingSettings = ref(false)
const draftSettings = ref<Record<string, any>>({})

function toggleSettings(projectTask: ProjectTaskRow) {
	if (expandedId.value === projectTask.id) {
		expandedId.value = null
		return
	}

	let fileConfig: Partial<TaskConfig & { src: string; dest: string; recursive: boolean }> = {}

	if (projectTask.config) {
		try {
			fileConfig = JSON.parse(projectTask.config)
		} catch {
			fileConfig = {}
		}
	}

	draftSettings.value = {
		on_failure: projectTask.on_failure,
		condition: projectTask.condition ?? '',
		local_working_dir: projectTask.local_working_dir ?? '',
		remote_working_dir: projectTask.remote_working_dir ?? '',
		retry_count: projectTask.retry_count,
		retry_delay: projectTask.retry_delay,
		config_src: fileConfig.src ?? '',
		config_dest: fileConfig.dest ?? '',
		config_recursive: fileConfig.recursive ?? false,
	}

	expandedId.value = projectTask.id
}

async function pickLocalDir() {
	const dir = await open({ multiple: false, directory: true })
	if (dir) draftSettings.value.local_working_dir = dir
}

async function saveSettings(projectTask: ProjectTaskRow) {
	isSavingSettings.value = true

	const input: Record<string, any> = {
		on_failure: draftSettings.value.on_failure,
		condition: draftSettings.value.condition?.trim() ? draftSettings.value.condition.trim() : null,
		local_working_dir: draftSettings.value.local_working_dir?.trim() || null,
		remote_working_dir: draftSettings.value.remote_working_dir?.trim() || null,
		retry_count:
			draftSettings.value.retry_count === '' || draftSettings.value.retry_count === undefined
				? null
				: draftSettings.value.retry_count,
		retry_delay:
			draftSettings.value.retry_delay === '' || draftSettings.value.retry_delay === undefined
				? null
				: draftSettings.value.retry_delay,
	}

	if (isFileTransferTask(projectTask)) {
		input.config = JSON.stringify({
			type: projectTask.task.type,
			src: draftSettings.value.config_src,
			dest: draftSettings.value.config_dest,
			recursive: !!draftSettings.value.config_recursive,
		})
	}

	const result = await invoke<CommandResponse>('crud_update_project_task', {
		id: projectTask.id,
		input,
	})

	if (result.success) {
		project.value = {
			...project.value,
			project_tasks: project.value.project_tasks.map(pt => (pt.id === projectTask.id ? { ...pt, ...input } : pt)),
		}
		toaster.success(t('overlays.toast.title.success'), t('notifications.project_tasks.updated'))
		expandedId.value = null
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}

	isSavingSettings.value = false
}
</script>

<template>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-medium text-muted">{{ t('pages.projects.tasks.title') }}</h3>
		<UButton v-if="!isAdding" :icon="ICONS.actions.add" size="sm" variant="soft" @click="startAdd">
			{{ t('pages.projects.tasks.add.label') }}
		</UButton>
	</div>

	<UCard v-if="isAdding" class="mb-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<UFormField :label="t('pages.projects.tasks.add.task.label')" class="flex-1">
				<USelectMenu
					v-model="newTaskId"
					value-key="id"
					:items="((tasksCatalog ?? []) as any[]).filter(task => !assignedIds.has(task.id))"
					:placeholder="t('pages.projects.tasks.add.task.placeholder')"
					class="w-full"
				/>
			</UFormField>
			<div class="flex gap-2">
				<UButton :icon="ICONS.actions.save" :loading="isSaving" :disabled="!newTaskId" @click="confirmAdd">
					{{ t('common.actions.save') }}
				</UButton>
				<UButton :icon="ICONS.actions.close" color="neutral" variant="soft" :disabled="isSaving" @click="cancelAdd">
					{{ t('common.actions.cancel') }}
				</UButton>
			</div>
		</div>
	</UCard>

	<div v-if="project.project_tasks.length" ref="sortable-container" class="flex flex-col gap-2">
		<UCard
			v-for="(projectTask, index) in project.project_tasks"
			:key="projectTask.id"
			:ui="{ body: 'flex flex-col gap-3' }"
			class="transition-colors hover:border-primary-500/50"
		>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
				<span
					class="handle flex cursor-grab items-center gap-2 text-muted transition-colors hover:text-primary active:cursor-grabbing"
				>
					<UIcon name="i-tabler-grip-vertical" class="size-5" />
				</span>

				<UBadge color="neutral" variant="subtle" class="font-mono shrink-0">
					{{ index + 1 }}
				</UBadge>

				<div class="min-w-0 flex-1 flex gap-2 items-center">
					<UBadge
						:color="projectTask.task.enabled ? 'success' : 'error'"
						variant="outline"
						:icon="projectTask.task.enabled ? getModuleIcon('tasks', 'singular') : getModuleIcon('tasks', 'off')"
					/>
					<div>
						<p class="truncate text-sm font-medium">
							<UBadge size="sm" variant="soft" color="neutral">ID {{ projectTask.task_id }}</UBadge>
							{{ projectTask.task.name }}
						</p>
						<UBadge
							size="sm"
							variant="subtle"
							color="neutral"
							:icon="(ICONS.taskType as Record<string, string>)[projectTask.task.type as string]"
						>
							{{ projectTask.task.type }}
						</UBadge>
					</div>
				</div>

				<UButton
					:icon="ICONS.app.settings"
					size="sm"
					color="neutral"
					:variant="expandedId === projectTask.id ? 'soft' : 'ghost'"
					@click="toggleSettings(projectTask)"
				/>

				<ToggleEnabled
					:enabled="projectTask.enabled"
					command="crud_update_project_task"
					:id="projectTask.id"
					@updated="
						(value: boolean) => {
							const updatedTasks = [...project.project_tasks]
							updatedTasks[index] = { ...updatedTasks[index], enabled: value }
							project = { ...project, project_tasks: updatedTasks }
						}
					"
				/>

				<UButton :icon="ICONS.actions.delete" color="error" variant="ghost" @click="removeTask(projectTask)" />
			</div>

			<div
				v-if="expandedId === projectTask.id"
				class="grid grid-cols-1 gap-4 border-t border-accented pt-3 md:grid-cols-2"
			>
				<UFormField :label="t('pages.projects.tasks.settings.on_failure.label')">
					<USelect
						v-model="draftSettings.on_failure"
						value-key="value"
						:items="[
							{ label: t('pages.projects.tasks.settings.on_failure.select.stop'), value: 'stop' },
							{ label: t('pages.projects.tasks.settings.on_failure.select.continue'), value: 'continue' },
							{ label: t('pages.projects.tasks.settings.on_failure.select.retry'), value: 'retry' },
						]"
						class="w-full"
					/>
				</UFormField>

				<UFormField :label="t('pages.projects.tasks.settings.condition.label')" :hint="t('form.shared.hint.optional')">
					<UInput
						v-model="draftSettings.condition"
						class="w-full font-mono"
						placeholder="ej: {{variable}} == 'value'"
					/>
				</UFormField>

				<UFormField
					:label="t('pages.projects.tasks.settings.local_working_dir.label')"
					:hint="t('form.shared.hint.optional')"
				>
					<UFieldGroup class="w-full">
						<UInput
							v-model="draftSettings.local_working_dir"
							class="w-full"
							:placeholder="project.local_working_dir || undefined"
						/>
						<UButton :icon="ICONS.actions.folder" @click="pickLocalDir" />
					</UFieldGroup>
				</UFormField>

				<UFormField
					:label="t('pages.projects.tasks.settings.remote_working_dir.label')"
					:hint="t('form.shared.hint.optional')"
				>
					<UInput
						v-model="draftSettings.remote_working_dir"
						class="w-full"
						:placeholder="project.remote_working_dir || undefined"
					/>
				</UFormField>

				<UFormField
					:label="t('pages.projects.tasks.settings.retry_count.label')"
					:hint="t('form.shared.hint.optional')"
				>
					<UInputNumber v-model="draftSettings.retry_count" class="w-full" :min="0" :max="20" />
				</UFormField>

				<UFormField
					:label="t('pages.projects.tasks.settings.retry_delay.label')"
					:hint="t('form.shared.hint.optional')"
				>
					<UInputNumber v-model="draftSettings.retry_delay" class="w-full" :min="0" :max="3600" />
				</UFormField>

				<template v-if="isFileTransferTask(projectTask)">
					<UFormField :label="t('pages.projects.tasks.settings.config_src.label')" required>
						<UInput v-model="draftSettings.config_src" class="w-full" />
					</UFormField>
					<UFormField :label="t('pages.projects.tasks.settings.config_dest.label')" required>
						<UInput v-model="draftSettings.config_dest" class="w-full" />
					</UFormField>
					<UCheckbox
						v-model="draftSettings.config_recursive"
						:label="t('pages.projects.tasks.settings.config_recursive.label')"
						class="md:col-span-2"
					/>
				</template>

				<div class="flex justify-end gap-2 md:col-span-2">
					<UButton
						:icon="ICONS.actions.close"
						color="neutral"
						variant="soft"
						:disabled="isSavingSettings"
						@click="() => { expandedId = null }"
					>
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton :icon="ICONS.actions.save" :loading="isSavingSettings" @click="saveSettings(projectTask)">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</div>
		</UCard>
	</div>
	<UEmpty
		v-else
		:icon="getModuleIcon('tasks', 'off')"
		:title="t('pages.projects.tasks.empty.title')"
		:description="t('pages.projects.tasks.empty.description')"
	/>
</template>
