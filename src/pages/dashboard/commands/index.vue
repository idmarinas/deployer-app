<script lang="ts">
import type { Command } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { h, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCommandQuery } from '@/composables/queries/commands'
import { useCommandTestDialog } from '@/composables/useDialog'
import { useTableColumns } from '@/composables/useTableColumns'
import { useCommandsListAll } from '@/loaders/commands'
import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-commands',
})

const { t } = useI18n()
const { data: items, isLoading, status, reload, refresh } = useCommandsListAll()
const commandQuery = useCommandQuery()

const { tableColumnExpand, tableColumnEnabled, tableColumnActions } = useTableColumns<Command>({
	moduleName: ModulesName.Commands,
	idParam: 'key',
	deleteFn: commandQuery.remove,
	onReload: reload,
})

const columns: TableColumn<Command>[] = [
	tableColumnExpand,
	{
		accessorKey: 'key',
		header: () => t('entity.command.key'),
		cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.key),
	},
	{
		accessorKey: 'name',
		header: () => t('entity.command.name'),
	},
	{
		accessorKey: 'timeout',
		header: () => t('entity.command.timeout'),
		cell: ({ row }) => `${row.original.timeout}s`,
	},
	tableColumnEnabled,
	tableColumnActions(row => [
		{
			id: 'test',
			action: 'before',
			targetId: 'edit',
			label: t('common.actions.test'),
			icon: ICONS.actions.play,
			color: 'success',
			variant: 'ghost',
			tooltip: true,
			onClick: async () => {
				const dialog = useCommandTestDialog()
				await dialog({
					title: row.original.name,
					command: row.original.command,
					parser: row.original.parser,
					timeout: row.original.timeout,
					commandKey: row.original.key,
				})
			},
		},
	]),
]

onMounted(() => {
	refresh()
})
</script>

<template>
	<ListTable v-if="!isLoading && status === 'success' && items.length > 0" :columns="columns" :items="items">
		<template #expanded="{ row }">
			<UCard>
				<template #title>
					<div class="flex items-center justify-between">
						<div class="flex gap-3 items-center">
							<UChip :color="row.original.enabled ? 'success' : 'error'" :show="true">
								<span class="text-lg font-semibold">{{ row.original.name }}</span>
							</UChip>
							<UBadge color="neutral" variant="soft" size="sm" class="font-mono"> @{{ row.original.key }} </UBadge>
							<UBadge color="info" variant="subtle" :icon="ICONS.misc.adjustments" :label="row.original.parser.type" />
						</div>
					</div>
				</template>

				<template #description>
					<DescriptionViewer :value="row.original.description" />
				</template>

				<div class="flex flex-col gap-2">
					<span class="text-xs text-muted font-medium">{{ t('entity.command.command') }}</span>
					<pre class="font-mono text-xs whitespace-pre-wrap break-all bg-elevated rounded-md p-3">{{
						row.original.command
					}}</pre>
				</div>

				<template #footer>
					<div class="flex gap-4 items-center justify-between text-xs text-muted">
						<span class="flex gap-1.5 items-center">
							<UIcon name="i-tabler-clock" class="size-4" />
							<strong>{{ t('entity.command.timeout') }}:</strong>
							{{ row.original.timeout }}s
						</span>
						<span class="flex gap-1.5 items-center">
							<UIcon name="i-tabler-calendar-time" class="size-4" />
							<strong>{{ t('entity.common.updated_at') }}:</strong>
							{{ new Date(row.original.updated_at).toLocaleString() }}
						</span>
					</div>
				</template>
			</UCard>
		</template>
	</ListTable>
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		:module="ModulesName.Commands"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-commands-add' }"
	/>
	<Loading v-else-if="isLoading" what="command" plural />
	<GeneralError v-else />
</template>
