<script lang="ts">
import type { Command } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { computed, h, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCommandQuery } from '@/composables/queries/commands'
import { useCommandTestDialog } from '@/composables/useDialog'
import { useTableColumns } from '@/composables/useTableColumns'
import { useCommandsListAll } from '@/loaders/commands'
import { useCommandsTrash } from '@/loaders/trash'
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
const trash = useCommandsTrash()

const trashCount = computed(() => trash.data.value?.length ?? 0)
const activeItems = computed(() => (items.value ?? []).filter(item => item.enabled))
const inactiveItems = computed(() => (items.value ?? []).filter(item => !item.enabled))

/** Pestaña seleccionada; el contenido se renderiza fuera de `UTabs` (ver `EntityListTab`). */
const tab = ref('active')
const isInactive = computed(() => tab.value === 'inactive')
const isTrash = computed(() => tab.value === 'trash')

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
			row.original.internal
				? h(UBadge, { label: t('entity.command.internal'), class: 'mr-2', size: 'xs', variant: 'soft' })
				: undefined,
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
	<UTabs
		v-model="tab"
		:content="false"
		:items="[
			{ label: t('common.tabs.active'), icon: ICONS.status.check, value: 'active' },
			{
				label: `${t('common.tabs.inactive')} ${inactiveItems.length > 0 ? `(${inactiveItems.length})` : ''}`,
				icon: ICONS.status.cross,
				value: 'inactive',
			},
			{
				label: `${t('common.tabs.trash')} ${trashCount > 0 ? `(${trashCount})` : ''}`,
				icon: ICONS.actions.trash,
				value: 'trash',
			},
		]"
	/>

	<TrashTable v-if="isTrash" :module="ModulesName.Commands" context="list" />

	<EntityListTab
		v-else
		:columns="columns"
		:items="isInactive ? inactiveItems : activeItems"
		:is-loading="isLoading"
		:status="status"
		:module="ModulesName.Commands"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-commands-add' }"
		:show-add="!isInactive"
		:title="isInactive ? t('components.empty_list.inactive.title') : undefined"
		:description="isInactive ? t('components.empty_list.inactive.description') : undefined"
		what="command"
	>
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
					<UBadge
						v-if="row.original.internal"
						variant="soft"
						:icon="ICONS.server.deviceDesktop"
						:label="t('entity.command.internal')"
					/>
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
	</EntityListTab>
</template>
