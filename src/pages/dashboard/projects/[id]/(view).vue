<script lang="ts">
import type { CommandResponse } from '@/types/tauri-types'
import type { TabsItem } from '@nuxt/ui'
import type { Ref, VNode } from 'vue'

import type { ProjectRow } from '@/composables/queries/projects'

import { computed, h, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentTitle } from '@/composables/useToolbarContent'
import { useProjectById } from '@/loaders/projects'
import { useRoute, useRouter } from 'vue-router'

import { useConfirmDialog } from '@/composables/useDialog'
import { useFrameworkBadge } from '@/composables/useFrameworkBadge'
import useToaster from '@/composables/useToaster'

import { ICONS } from '@/utils/icons'

import UButton from '@nuxt/ui/components/Button.vue'
import UTooltip from '@nuxt/ui/components/Tooltip.vue'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/projects/:id(\\d+)',
	name: 'dashboard-projects-id',
	params: {
		path: {
			id: 'int',
		},
	},
})

const toolbar = useDashboardToolbar('projects')
const route = useRoute('dashboard-projects-id')
const router = useRouter()
const toaster = useToaster()

const { t, locale } = useI18n()
const { data: project, isLoading, status, error, reload } = useProjectById()

const title = computed(() => project.value?.name || '')
const toolbarButtons = computed<VNode[]>(() => [
	h(UTooltip, { text: t('common.back.list'), delayDuration: 0 }, () =>
		h(UButton, {
			icon: 'i-tabler-list',
			async onClick() {
				router.push({ name: 'dashboard-projects' })
			},
		}),
	),

	h(UTooltip, { text: t('common.actions.delete'), delayDuration: 0 }, () =>
		h(UButton, {
			icon: ICONS.actions.delete,
			color: 'error',
			async onClick() {
				const dialog = useConfirmDialog()

				const result = await dialog({
					title: t('common.confirm.delete.label'),
					description: t('common.confirm.delete.description', { name: title.value }),
					type: 'cancel_delete',
				})

				if (result) {
					const notice = toaster.warning(
						t('notifications.projects.delete.loading.title'),
						t('notifications.projects.delete.loading.description', { name: project.value.name }),
						{ duration: 0 },
					)

					const result = await invoke<CommandResponse>('crud_delete_project', { id: project.value.id })

					if (result.success) {
						toaster.toast.update(
							notice.id,
							toaster.success(
								t('notifications.projects.delete.success.title'),
								t('notifications.projects.delete.success.description', { name: project.value.name }),
								{ id: notice.id, duration: undefined },
							),
						)
					} else {
						toaster.toast.update(
							notice.id,
							toaster.error(
								t('notifications.projects.delete.error.title'),
								t('notifications.projects.delete.error.description', { name: project.value.name }),
								{ id: notice.id, duration: undefined },
							),
						)
					}

					await router.push({ name: 'dashboard-projects' })
				}
			},
		}),
	),
])
const items = ref<TabsItem[]>([
	{
		label: 'Proyecto',
		icon: 'i-tabler-info-circle',
		slot: 'info',
	},
	{
		label: 'Hosts',
		icon: 'i-tabler-server',
		slot: 'hosts',
	},
	{
		label: 'Tareas',
		icon: 'i-tabler-list-details',
		slot: 'tasks',
	},
	{
		label: 'Variables',
		icon: 'i-tabler-variable',
		slot: 'variables',
	},
])
const isEditMode = ref(false)

function updatedEnabled(enabled: boolean) {
	project.value = {
		...project.value,
		enabled,
	}
}

useToolbarContentTitle(title, toolbar, toolbarButtons)
// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
	reload()
	toolbar?.clearContent()
})

// Limpiar el toolbar cuando se desmoºnta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

// Actualizar toolbar cuando isLoading cambia
watch([isLoading, title], ([newValue], [newTitle]) => {
	if (newValue) {
		toolbar?.clearContent()
	} else {
		if (newTitle) {
			toolbar?.updateToolbar()
		}
	}
})

watch(
	() => route.params.id,
	() => reload(),
)

provide<Ref<ProjectRow>>('project', project)
provide<Ref<boolean>>('isEditMode', isEditMode)
provide('reloadProject', reload)
</script>

<template>
	<template v-if="!isLoading && status === 'success' && project">
		<UCard :ui="{ title: 'flex justify-between' }">
			<template #title>
				<div class="flex items-center gap-2">
					<UBadge color="neutral" variant="soft"> ID: {{ project.id }} </UBadge>
					<ToggleEnabled
						:enabled="project.enabled"
						command="crud_update_project"
						:id="project.id"
						@updated="updatedEnabled"
					/>
				</div>
				<component :is="useFrameworkBadge(project.framework, { size: undefined })" />
			</template>
			<template #description>
				<DescriptionViewer :value="project.description" :placeholder="t('common.empty.description')" />
			</template>
			<template #footer>
				<div class="flex gap-4 items-center justify-between text-xs text-muted">
					<span class="flex gap-1.5 items-center">
						<UIcon name="i-tabler-calendar-plus" class="size-4" />
						<strong>{{ t('entity.common.created_at') }}:</strong>
						{{ new Date(project.created_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
					</span>
					<span class="flex gap-1.5 items-center">
						<UIcon name="i-tabler-calendar-time" class="size-4" />
						<strong>{{ t('entity.common.updated_at') }}:</strong>
						{{ new Date(project.updated_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
					</span>
				</div>
			</template>
		</UCard>
		<UTabs :items="items" class="w-full">
			<template #info><ProjectTabInfo /></template>
			<template #hosts><ProjectTabHosts /></template>
			<template #tasks><ProjectTabTasks /></template>
			<template #variables> <ProjectTabVariables /> </template>
		</UTabs>
	</template>
	<StatusError
		v-else-if="status === 'error' && error?.message === 'not-found'"
		icon="i-tabler-package-off"
		code="not_found"
		module="project"
	/>
	<Loading v-else-if="isLoading" what="project" />
	<UError v-else />
</template>
