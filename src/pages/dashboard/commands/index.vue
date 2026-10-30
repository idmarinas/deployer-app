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

import UBadge from '@nuxt/ui/components/Badge.vue'
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
		cell: ({ row }) => [
			h('span', { class: 'font-mono text-xs' }, row.original.key),
			row.original.internal ? h(UBadge, { label: 'Internal', class: 'mr-2', size: 'xs', variant: 'soft' }) : undefined,
		],
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
			<ItemCard
				:id="row.original.key"
				:name="row.original.name"
				:description="row.original.description"
				:updated_at="row.original.updated_at"
				:created_at="row.original.created_at"
				:enabled="row.original.enabled"
			>
				<template #title-right>
					<UBadge v-if="row.original.internal" variant="soft" icon="i-tabler-device-desktop" label="Internal" />
					<UBadge color="info" variant="subtle" :icon="ICONS.misc.adjustments" :label="row.original.parser.type" />
				</template>
				<div class="flex flex-col gap-2">
					<span class="text-xs text-muted font-medium">{{ t('entity.command.command') }}</span>
					<pre class="font-mono text-xs whitespace-pre-wrap break-all bg-elevated rounded-md p-3">{{
						row.original.command
					}}</pre>
				</div>
			</ItemCard>
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
