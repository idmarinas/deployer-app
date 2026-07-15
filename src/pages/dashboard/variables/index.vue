<script lang="ts">
import type { TableColumn } from '@nuxt/ui'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTableColumns } from '@/composables/useTableColumns'
import { useGlobalVariablesList } from '@/loaders/global_variables'
import { GlobalVariable } from '@/types/tauri-types'

import { ICONS } from '@/utils/icons'

import UBadge from '@nuxt/ui/components/Badge.vue'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-global_variables',
})

const { t } = useI18n()
const { data: items, isLoading, status, reload } = useGlobalVariablesList()

const { tableColumnExpand, tableColumnActions } = useTableColumns<GlobalVariable>({
	moduleName: 'global_variables',
	singularName: 'global_variable',
	onReload: reload,
})

const columns: TableColumn<GlobalVariable>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.global_variables.table.columns.name'),
	},
	{
		accessorKey: 'slug',
		header: t('pages.global_variables.table.columns.slug'),
	},
	{
		accessorKey: 'is_secret',
		header: t('pages.global_variables.table.columns.is_secret'),
		cell({ row }) {
			const label = row.getValue('is_secret') ? t('common.common.yes') : t('common.common.no')
			const color = row.getValue('is_secret') ? 'error' : 'success'
			const icon = row.getValue('is_secret') ? ICONS.misc.lock : ICONS.misc.lockOpen

			return h(UBadge, { label, color, icon })
		},
	},
	{
		accessorKey: 'data_type',
		header: t('pages.global_variables.table.columns.data_type'),
	},
	tableColumnActions(),
]
</script>

<template>
	<ListTable v-if="!isLoading && status === 'success' && items.length > 0" :columns="columns" :items="items">
		<template #expanded="{ row }">
			<ItemCard
				:id="row.original.id"
				:name="row.original.name"
				:description="row.original.description"
				:updated_at="row.original.updated_at"
				:created_at="row.original.created_at"
			>
				<template #title-right>
					<UBadge color="neutral" :label="row.original.data_type" />
				</template>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="md:col-span-3 flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.global_variable.value') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon name="i-tabler-file-description" class="text-muted size-4" />
							<pre><ValueViewer :value="row.original.value" only-text /></pre>
						</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.global_variable.usage') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon name="i-tabler-variable" class="text-muted size-4" />
							&#123;&#123;{{ row.original.slug }}&#125;&#125;
						</span>
					</div>
				</div>
			</ItemCard>
		</template>
	</ListTable>
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		module="global_variables"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-global_variables-add' }"
	/>
	<Loading v-else-if="isLoading" what="global_variable" plural />
	<GeneralError v-else />
</template>
