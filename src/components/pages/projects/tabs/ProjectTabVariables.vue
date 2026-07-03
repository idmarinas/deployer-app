<!--
	Tab "Variables" del detalle de proyecto: gestiona `project_variables`.

	A diferencia de Hosts/Tasks, no hay catálogo que asignar: la variable
	pertenece directamente al proyecto (CRUD simple, sin relación N:M).
	Igual que las otras tabs de relaciones, no depende del `isEditMode` global:
	alta, edición y baja son siempre disponibles con guardado inmediato.
-->
<script lang="ts">
import type { CommandResponse, ProjectVariable } from '@/types/tauri-types'

import { inject, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfirmDialog } from '@/composables/useDialog'
import useToaster from '@/composables/useToaster'
import { getModuleIcon, ICONS } from '@/utils/icons'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
interface VariableDraft {
	name: string
	value: string
	is_secret: boolean
	description: string
}

const project = inject('project') as any
// `project` viene de un shallowRef (pinia-colada): esta tab lee directamente
// de `project.project_variables` (sin copia local), así que cualquier
// mutación necesita recargar el proyecto entero para que la vista se entere.
const reloadProject = inject<(() => Promise<unknown>) | undefined>('reloadProject')

const { t } = useI18n()
const toaster = useToaster()
const confirmDialog = useConfirmDialog()

const isAdding = ref(false)
const isSaving = ref(false)
const newVariable = reactive<VariableDraft>({ name: '', value: '', is_secret: false, description: '' })

const editingId = ref<number | null>(null)
const draft = reactive<VariableDraft>({ name: '', value: '', is_secret: false, description: '' })
const revealedIds = ref<Set<number>>(new Set())

function toggleReveal(id: number) {
	const next = new Set(revealedIds.value)
	next.has(id) ? next.delete(id) : next.add(id)
	revealedIds.value = next
}

function startAdd() {
	newVariable.name = ''
	newVariable.value = ''
	newVariable.is_secret = false
	newVariable.description = ''
	isAdding.value = true
}

function cancelAdd() {
	isAdding.value = false
}

async function confirmAdd() {
	if (!newVariable.name.trim() || !newVariable.value.trim()) return

	isSaving.value = true

	const result = await invoke<CommandResponse<number>>('crud_create_project_variable', {
		input: {
			project_id: project.value.id,
			name: newVariable.name.trim(),
			value: newVariable.value,
			is_secret: newVariable.is_secret,
			description: newVariable.description.trim() || null,
		},
	})

	if (result.success && result.data) {
		await reloadProject?.()

		toaster.success(t('overlays.toast.title.success'), t('notifications.project_variables.added'))
		isAdding.value = false
	} else {
		toaster.error(
			t('overlays.toast.title.error'),
			result.message_key ? t(result.message_key as any, result.message_params) : t('overlays.toast.description.error'),
		)
	}

	isSaving.value = false
}

function startEdit(variable: ProjectVariable) {
	draft.name = variable.name
	draft.value = variable.value
	draft.is_secret = variable.is_secret
	draft.description = variable.description ?? ''
	editingId.value = variable.id
}

function cancelEdit() {
	editingId.value = null
}

async function saveEdit(variable: ProjectVariable) {
	isSaving.value = true

	const input = {
		name: draft.name.trim(),
		value: draft.value,
		is_secret: draft.is_secret,
		description: draft.description.trim() || null,
	}

	const result = await invoke<CommandResponse>('crud_update_project_variable', {
		id: variable.id,
		input,
	})

	if (result.success) {
		await reloadProject?.()
		toaster.success(t('overlays.toast.title.success'), t('notifications.project_variables.updated'))
		editingId.value = null
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}

	isSaving.value = false
}

async function removeVariable(variable: ProjectVariable) {
	const confirmed = await confirmDialog({
		type: 'cancel_delete',
		title: t('common.confirm.delete.label'),
		description: t('common.confirm.delete.description', { name: variable.name }),
	})

	if (!confirmed) return

	const result = await invoke<CommandResponse>('crud_delete_project_variable', { id: variable.id })

	if (result.success) {
		await reloadProject?.()
		toaster.success(t('overlays.toast.title.success'), t('notifications.project_variables.deleted'))
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}
}
</script>

<template>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-medium text-muted">{{ t('pages.projects.variables.title') }}</h3>
		<UButton v-if="!isAdding" :icon="ICONS.actions.add" size="sm" variant="soft" @click="startAdd">
			{{ t('pages.projects.variables.add.label') }}
		</UButton>
	</div>

	<UCard v-if="isAdding" class="mb-4">
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<UFormField :label="t('pages.projects.variables.field.name.label')">
				<UInput v-model="newVariable.name" autocomplete="off" class="w-full font-mono" />
			</UFormField>
			<UFormField :label="t('pages.projects.variables.field.value.label')">
				<UInput v-model="newVariable.value" autocomplete="off" class="w-full font-mono" :type="newVariable.is_secret ? 'password' : 'text'" />
			</UFormField>
			<UFormField :label="t('pages.projects.variables.field.description.label')" :hint="t('form.shared.hint.optional')" class="md:col-span-2">
				<UInput v-model="newVariable.description" class="w-full" />
			</UFormField>
			<UCheckbox v-model="newVariable.is_secret" :label="t('pages.projects.variables.field.is_secret.label')" />
			<div class="flex justify-end gap-2 md:col-span-2">
				<UButton :icon="ICONS.actions.close" color="neutral" variant="soft" :disabled="isSaving" @click="cancelAdd">
					{{ t('common.actions.cancel') }}
				</UButton>
				<UButton
					:icon="ICONS.actions.save"
					:loading="isSaving"
					:disabled="!newVariable.name.trim() || !newVariable.value.trim()"
					@click="confirmAdd"
				>
					{{ t('common.actions.save') }}
				</UButton>
			</div>
		</div>
	</UCard>

	<div v-if="(project.project_variables as ProjectVariable[])?.length" class="flex flex-col gap-2">
		<UCard v-for="variable in project.project_variables as ProjectVariable[]" :key="variable.id">
			<!-- Vista -->
			<div v-if="editingId !== variable.id" class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="truncate font-mono text-sm font-medium">{{ variable.name }}</span>
						<UBadge v-if="variable.is_secret" size="xs" color="warning" variant="subtle" :icon="ICONS.auth.lock">
							{{ t('pages.projects.variables.field.is_secret.label') }}
						</UBadge>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="truncate font-mono text-xs text-muted">
							{{ variable.is_secret && !revealedIds.has(variable.id) ? '••••••••' : variable.value }}
						</span>
						<UButton
							v-if="variable.is_secret"
							:icon="revealedIds.has(variable.id) ? ICONS.actions.viewOff : ICONS.actions.view"
							size="xs"
							color="neutral"
							variant="ghost"
							@click="toggleReveal(variable.id)"
						/>
					</div>
					<p v-if="variable.description" class="truncate text-xs text-muted italic">{{ variable.description }}</p>
				</div>

				<div class="flex gap-2 self-end sm:self-auto">
					<UButton :icon="ICONS.actions.edit" size="sm" color="neutral" variant="ghost" @click="startEdit(variable)" />
					<UButton :icon="ICONS.actions.delete" size="sm" color="error" variant="ghost" @click="removeVariable(variable)" />
				</div>
			</div>

			<!-- Edición -->
			<div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<UFormField :label="t('pages.projects.variables.field.name.label')">
					<UInput v-model="draft.name" autocomplete="off" class="w-full font-mono" />
				</UFormField>
				<UFormField :label="t('pages.projects.variables.field.value.label')">
					<UInput v-model="draft.value" autocomplete="off" class="w-full font-mono" :type="draft.is_secret ? 'password' : 'text'" />
				</UFormField>
				<UFormField :label="t('pages.projects.variables.field.description.label')" :hint="t('form.shared.hint.optional')" class="md:col-span-2">
					<UInput v-model="draft.description" class="w-full" />
				</UFormField>
				<UCheckbox v-model="draft.is_secret" :label="t('pages.projects.variables.field.is_secret.label')" />
				<div class="flex justify-end gap-2 md:col-span-2">
					<UButton :icon="ICONS.actions.close" color="neutral" variant="soft" :disabled="isSaving" @click="cancelEdit">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton :icon="ICONS.actions.save" :loading="isSaving" @click="saveEdit(variable)">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</div>
		</UCard>
	</div>
	<UEmpty
		v-else
		:icon="getModuleIcon('variables', 'off')"
		:title="t('pages.projects.variables.empty.title')"
		:description="t('pages.projects.variables.empty.description')"
	/>
</template>
