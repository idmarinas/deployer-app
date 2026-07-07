<!--
	Tab "Hosts" del detalle de proyecto: gestiona la relación N:M project_hosts.

	No depende del `isEditMode` global de la pantalla (ese toggle es para el
	formulario de datos propios del proyecto, en ProjectTabInfo). Aquí añadir,
	reordenar, activar/desactivar y quitar servidores son acciones siempre
	disponibles, cada una con su propio guardado inmediato.
-->
<script lang="ts">
import type { ProjectHostRow, ProjectRow } from '@/composables/queries/projects'
import type { CommandResponse, ProjectHost } from '@/types/tauri-types'
import type { Ref } from 'vue'

import { useSortable } from '@vueuse/integrations/useSortable'
import { computed, inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfirmDialog } from '@/composables/useDialog'
import { useQuery } from '@/composables/useQuery'
import useToaster from '@/composables/useToaster'
import { getModuleIcon, ICONS } from '@/utils/icons'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
const project = inject<Ref<ProjectRow>>('project')!

const { t } = useI18n()
const toaster = useToaster()
const confirmDialog = useConfirmDialog()

const isAdding = ref(false)
const isSaving = ref(false)
const newHostId = ref<number | null>(null)

const sortableContainer = useTemplateRef('sortable-container')

useSortable(sortableContainer, project.value.project_hosts, {
	handle: '.handle',
	animation: 150,
	watchElement: true,
	// WebView2/WebKit embebidos (Tauri) no disparan bien los eventos nativos de
	// HTML5 Drag & Drop que usa Sortable.js por defecto: sin esto, el drag no
	// arranca en ningún caso (sin error, simplemente no pasa nada).
	forceFallback: true,
	onUpdate: async event => {
		// Sortable.js mueve el elemento en el DOM, pero NO reordena `localHosts`
		// automáticamente al sobrescribir `onUpdate` (eso solo lo hace el
		// comportamiento por defecto que estamos reemplazando aquí). Hay que
		// reordenar el array nosotros mismos usando oldIndex/newIndex del evento
		// antes de recalcular y persistir el `deploy_order`.
		const { oldIndex, newIndex } = event
		if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

		const reordered = project.value.project_hosts
		const [moved] = reordered.splice(oldIndex, 1)
		reordered.splice(newIndex, 0, moved)

		const updatePromises: Promise<unknown>[] = []

		reordered.forEach((item, idx) => {
			if (item.deploy_order !== idx) {
				item.deploy_order = idx
				updatePromises.push(
					invoke<CommandResponse>('crud_update_project_host', {
						id: item.id,
						input: { deploy_order: idx },
					}),
				)
			}
		})

		// Sincronizar el array original optimísticamente
		project.value = {
			...project.value,
			project_hosts: reordered,
		}

		try {
			await Promise.all(updatePromises)
		} catch (error) {
			console.error('Error updating deploy order:', error)
			toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
		}
	},
})

const assignedIds = computed(() => new Set((project.value.project_hosts as ProjectHost[]).map(ph => ph.host_id)))

function startAdd() {
	newHostId.value = null
	isAdding.value = true
}

function cancelAdd() {
	isAdding.value = false
}

async function confirmAdd() {
	if (!newHostId.value) return

	isSaving.value = true

	const result = await invoke<CommandResponse<number>>('crud_create_project_host', {
		input: {
			project_id: project.value.id,
			host_id: newHostId.value,
			deploy_order: project.value.project_hosts.length,
			enabled: true,
		},
	})

	if (result.success && result.data) {
		const { projects } = useQuery()
		const newProjectHost = await projects.findProjectHostById(result.data)

		project.value = {
			...project.value,
			project_hosts: [...project.value.project_hosts, newProjectHost!],
		}

		toaster.success(t('overlays.toast.title.success'), t('notifications.project_hosts.added'))
		isAdding.value = false
	} else {
		toaster.error(
			t('overlays.toast.title.error'),
			result.message_key ? t(result.message_key as any, result.message_params) : t('overlays.toast.description.error'),
		)
	}

	isSaving.value = false
}

async function removeHost(projectHost: ProjectHostRow) {
	const confirmed = await confirmDialog({
		type: 'cancel_delete',
		title: t('common.confirm.delete.label'),
		description: t('common.confirm.delete.description', { name: projectHost.host.name ?? `ID ${projectHost.host_id}` }),
	})

	if (!confirmed) return

	const result = await invoke<CommandResponse>('crud_delete_project_host', { id: projectHost.id })

	if (result.success) {
		project.value = {
			...project.value,
			project_hosts: (project.value.project_hosts as ProjectHostRow[]).filter(ph => ph.id !== projectHost.id),
		}
		toaster.success(t('overlays.toast.title.success'), t('notifications.project_hosts.deleted'))
	} else {
		toaster.error(t('overlays.toast.title.error'), t('overlays.toast.description.error'))
	}
}

function canDeployInHost(ph: ProjectHostRow) {
	return ph.host.enabled && ph.enabled
}
</script>

<template>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-medium text-muted">{{ t('pages.projects.hosts.title') }}</h3>
		<UButton v-if="!isAdding" :icon="ICONS.actions.add" size="sm" variant="soft" @click="startAdd">
			{{ t('pages.projects.hosts.add.label') }}
		</UButton>
	</div>

	<UCard v-if="isAdding" class="mb-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<UFormField :label="t('pages.projects.hosts.add.host.label')" class="flex-1">
				<SelectHost
					v-model="newHostId"
					value-key="id"
					:ignore-hosts="assignedIds"
					:disabled="isSaving"
					class="w-full"
				/>
			</UFormField>
			<div class="flex gap-2">
				<UButton :icon="ICONS.actions.save" :loading="isSaving" :disabled="!newHostId" @click="confirmAdd">
					{{ t('common.actions.save') }}
				</UButton>
				<UButton :icon="ICONS.actions.close" color="neutral" variant="soft" :disabled="isSaving" @click="cancelAdd">
					{{ t('common.actions.cancel') }}
				</UButton>
			</div>
		</div>
	</UCard>

	<div v-if="project.project_hosts.length" ref="sortable-container" class="flex flex-col gap-2">
		<UCard
			v-for="(projectHost, index) in project.project_hosts"
			:key="projectHost.id"
			:ui="{ header: 'p-0.5', body: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4' }"
			class="hover:border-primary-500/50 transition-colors"
		>
			<template #header>
				<UBadge
					class="w-full"
					:icon="canDeployInHost(projectHost) ? 'i-tabler-cloud-upload' : 'i-tabler-cloud-off'"
					variant="outline"
					:color="canDeployInHost(projectHost) ? 'success' : 'error'"
					:label="t(canDeployInHost(projectHost) ? 'common.deploy.can' : 'common.deploy.cannot')"
					size="lg"
				/>
			</template>
			<span class="cursor-grab active:cursor-grabbing text-muted hover:text-primary transition-colors handle">
				<UIcon name="i-tabler-grip-vertical" class="size-5" />
			</span>
			<UBadge color="neutral" variant="subtle" class="font-mono shrink-0">
				{{ index + 1 }}
			</UBadge>

			<div class="min-w-0 flex-1 flex gap-2 items-center">
				<UBadge
					:color="projectHost.host.enabled ? 'success' : 'error'"
					variant="outline"
					:icon="projectHost.host.enabled ? getModuleIcon('hosts', 'singular') : getModuleIcon('hosts', 'off')"
				/>
				<div>
					<p class="truncate text-sm font-medium">
						<UBadge size="sm" variant="soft" color="neutral">ID {{ projectHost.host_id }}</UBadge>
						{{ projectHost.host.name }}
					</p>
					<p class="truncate text-xs text-muted">
						<strong>{{ t('common.common.username') }}</strong> {{ projectHost.host.username }}
					</p>
				</div>
			</div>

			<ToggleEnabled
				:enabled="projectHost.enabled"
				command="crud_update_project_host"
				:id="projectHost.id"
				@updated="
					(value: boolean) => {
						const updatedHosts = [...project.project_hosts]
						updatedHosts[index].enabled = value
						project = { ...project, project_hosts: updatedHosts }
					}
				"
			/>

			<UButton :icon="ICONS.actions.delete" color="error" variant="ghost" @click="removeHost(projectHost)" />
		</UCard>
	</div>
	<UEmpty
		v-else
		:icon="getModuleIcon('hosts', 'off')"
		:title="t('pages.projects.hosts.empty.title')"
		:description="t('pages.projects.hosts.empty.description')"
	/>
</template>
