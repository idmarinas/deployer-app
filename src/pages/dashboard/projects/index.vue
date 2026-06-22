<script lang="ts">
import type { CommandResponse, Project } from '@/types/tauri-types'
import type { TableColumn } from '@nuxt/ui'

import { h, ref, resolveComponent, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfirmDialog } from '@/composables/useDialog'
import { useProjectsListAll } from '@/loaders/projects'
import { useToast } from '@nuxt/ui/composables'
import { useRouter } from 'vue-router'

import { useFrameworkBadge } from '@/composables/useFrameworkBadge'
import { useTableColumns } from '@/composables/useTableColumns'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-projects',
})

const UButton = resolveComponent('UButton')

const { t } = useI18n()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const router = useRouter()
const { tableColumnEnabled } = useTableColumns<Project>()

const { data: projects, isLoading, reload } = useProjectsListAll()

const columns: TableColumn<Project>[] = [
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.projects.table.columns.name'),
	},
	{
		accessorKey: 'git_url',
		header: t('pages.projects.table.columns.git_url'),
	},
	tableColumnEnabled,
	{
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) =>
			h('div', { class: 'flex gap-2 justify-end' }, [
				h(UButton, {
					color: 'neutral',
					variant: 'ghost',
					icon: 'i-tabler-eye',
					async onClick() {
						router.push({ name: 'dashboard-projects-id', params: { id: row.original.id } })
					},
				}),
				h(UButton, {
					icon: 'i-tabler-pencil',
					color: 'info',
					variant: 'ghost',
					async onClick() {
						router.push({ name: 'dashboard-projects-id-edit', params: { id: row.original.id } })
					},
				}),
				h(UButton, {
					icon: 'i-tabler-trash',
					color: 'error',
					variant: 'ghost',
					async onClick() {
						const result = await confirmDialog({
							type: 'cancel_delete',
							title: t('common.delete.label'),
							description: t('common.delete.description', { name: row.original.name }),
						})

						if (result) {
							const notice = toast.add({
								title: t('pages.projects.toast.delete.loading.title'),
								description: t('pages.projects.toast.delete.loading.description', { name: row.original.name }),
								color: 'warning',
								icon: 'i-tabler-trash',
								duration: 0,
							})

							const result = await invoke<CommandResponse>('crud_delete_project', { id: row.original.id })

							if (result.success) {
								toast.update(notice.id, {
									title: t('pages.projects.toast.delete.success.title'),
									description: t('pages.projects.toast.delete.success.description', { name: row.original.name }),
									color: 'success',
									icon: 'i-tabler-check',
									duration: undefined,
								})
							} else {
								toast.update(notice.id, {
									title: t('pages.projects.toast.delete.error.title'),
									description: t('pages.projects.toast.delete.error.description', { name: row.original.name }),
									color: 'error',
									icon: 'i-tabler-x',
									duration: undefined,
								})
							}

							await reload()
						}
					},
				}),
			]),
	},
]

const table = useTemplateRef('table')
const columnVisibility = ref({})
const globalFilter = ref('')
const expanded = ref({})
</script>

<template>
	<Loading v-if="isLoading" what="project" plural />
	<div v-else-if="!isLoading && projects.length > 0" class="flex flex-col flex-1 w-full">
		<div class="flex py-3.5 border-b border-accented justify-between">
			<GlobalFilter v-model="globalFilter" />
			<ToogleColumVisibility :table-api="table?.tableApi" />
		</div>

		<UTable
			ref="table"
			sticky
			v-model:expanded="expanded"
			v-model:global-filter="globalFilter"
			v-model:column-visibility="columnVisibility"
			:data="projects"
			:columns="columns"
			:ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
		>
			<template #expanded="{ row }">
				<ItemCard
					:id="row.original.id"
					:name="row.original.name"
					:description="row.original.description || undefined"
					:created_at="row.original.created_at"
					:updated_at="row.original.updated_at"
					:enabled="row.original.enabled"
				>
					<template #title-right>
						<component :is="useFrameworkBadge(row.original.framework, { size: undefined })" />
					</template>

					<template #default>
						<!-- Grid de detalles -->
						<div class="grid grid-cols-1 gap-6">
							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.project.git_url') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-brand-git" class="text-muted size-4" />
									{{ row.original.git_url }}
								</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.project.local_working_dir') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-device-desktop" class="text-muted size-4" />
									{{ row.original.local_working_dir }}
								</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.project.remote_working_dir') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-server" class="text-muted size-4" />
									{{ row.original.remote_working_dir }}
								</span>
							</div>
						</div>
					</template>
				</ItemCard>
			</template>
		</UTable>
	</div>
	<UEmpty
		v-else
		icon="i-tabler-packages"
		:title="t('pages.projects.table.empty.title')"
		:description="t('pages.projects.table.empty.description')"
		:actions="[
			{
				icon: 'i-tabler-plus',
				label: t('components.navigation.add.project.label'),
				to: { name: 'dashboard-projects-add' },
			},
			{
				icon: 'i-tabler-refresh',
				label: t('common.refresh'),
				color: 'neutral',
				variant: 'soft',
				onClick: () => reload(),
			},
		]"
	/>
</template>
