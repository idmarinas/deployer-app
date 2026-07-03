<script lang="ts">
import type { CommandResponse, Task } from '@/types/tauri-types'
import type { TableColumn } from '@nuxt/ui'

import { h, ref, resolveComponent, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfirmDialog } from '@/composables/useDialog'
import { useTableColumns } from '@/composables/useTableColumns'
import { useTaskListAll } from '@/loaders/tasks'
import { ICONS, getModuleIcon } from '@/utils/icons'
import { useToast } from '@nuxt/ui/composables'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-tasks',
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { t, locale } = useI18n()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const router = useRouter()
const { tableColumnExpand, tableColumnEnabled } = useTableColumns<Task>()

const { data: tasks, isLoading, reload } = useTaskListAll()

const taskTypeLabels: Record<string, string> = {
	command: t('form.tasks.task_type.select.command'),
	script: t('form.tasks.task_type.select.script'),
	upload_file: t('form.tasks.task_type.select.upload_file'),
	download_file: t('form.tasks.task_type.select.download_file'),
}

const columns: TableColumn<Task>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.tasks.table.columns.name'),
	},
	{
		accessorKey: 'type',
		header: t('pages.tasks.table.columns.task_type'),
		cell({ row }) {
			const type = row.getValue('type') as string
			const label = taskTypeLabels[type] ?? type
			const icon = (ICONS.taskType as Record<string, string>)[type]

			return h(UBadge, { label, icon, color: 'neutral', variant: 'subtle' })
		},
	},
	{
		accessorKey: 'timeout',
		header: t('pages.tasks.table.columns.timeout'),
		cell: ({ row }) => `${row.getValue('timeout')}s`,
	},
	tableColumnEnabled,
	{
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) =>
			h('div', { class: 'flex gap-2 justify-end' }, [
				h(UButton, {
					icon: ICONS.actions.edit,
					color: 'info',
					variant: 'ghost',
					async onClick() {
						router.push({ name: 'dashboard-tasks-id-edit', params: { id: row.original.id as number } })
					},
				}),
				h(UButton, {
					icon: ICONS.actions.delete,
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
								title: t('pages.tasks.toast.delete.loading.title'),
								description: t('pages.tasks.toast.delete.loading.description', { name: row.original.name }),
								color: 'warning',
								icon: ICONS.actions.delete,
								duration: 0,
							})

							const deleteResult = await invoke<CommandResponse>('crud_delete_task', { id: row.original.id })

							if (deleteResult.success) {
								toast.update(notice.id, {
									title: t('pages.tasks.toast.delete.success.title'),
									description: t('pages.tasks.toast.delete.success.description', { name: row.original.name }),
									color: 'success',
									icon: ICONS.status.check,
									duration: undefined,
								})
							} else {
								toast.update(notice.id, {
									title: t('pages.tasks.toast.delete.error.title'),
									description: t('pages.tasks.toast.delete.error.description', { name: row.original.name }),
									color: 'error',
									icon: ICONS.status.cross,
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
	<div v-if="isLoading || tasks.length > 0" class="flex flex-col flex-1 w-full">
		<div class="flex py-3.5 border-b border-accented justify-between">
			<GlobalFilter v-model="globalFilter" />
			<ToogleColumVisibility :table-api="table?.tableApi" />
		</div>

		<UTable
			ref="table"
			sticky
			:loading="isLoading"
			v-model:expanded="expanded"
			v-model:global-filter="globalFilter"
			v-model:column-visibility="columnVisibility"
			:data="tasks"
			:columns="columns"
			:ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
		>
			<template #expanded="{ row }">
				<ItemCard
					:id="row.original.id"
					:name="row.original.name"
					:description="row.original.description || undefined"
					:enabled="row.original.enabled"
					:created_at="row.original.created_at"
					:updated_at="row.original.updated_at"
				>
					<template #title-right>
						<UBadge
							color="neutral"
							variant="subtle"
							:icon="(ICONS.taskType as Record<string, string>)[row.original.type]"
						>
							{{ taskTypeLabels[row.original.type] ?? row.original.type }}
						</UBadge>
					</template>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div v-if="row.original.command" class="flex flex-col gap-1 md:col-span-3">
							<span class="text-xs text-muted font-medium">{{ t('entity.task.command') }}</span>
							<pre class="text-xs font-mono bg-elevated/50 rounded p-2 overflow-x-auto">{{ row.original.command }}</pre>
						</div>

						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.task.timeout') }}</span>
							<span class="text-sm font-mono">{{ row.original.timeout }}s</span>
						</div>

						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.task.retry_count') }}</span>
							<span class="text-sm font-mono">{{ row.original.retry_count }}</span>
						</div>

						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.task.retry_delay') }}</span>
							<span class="text-sm font-mono">{{ row.original.retry_delay }}s</span>
						</div>
					</div>
				</ItemCard>
			</template>
		</UTable>
	</div>
	<EmptyList v-else module="tasks" :add-route="{ name: 'dashboard-tasks-add' }" :reload-fn="reload" />
</template>
