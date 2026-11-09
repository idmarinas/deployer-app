<script lang="ts">
import type { Variable } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { h } from 'vue'
import { useI18n } from 'vue-i18n'

import { useVariableQuery } from '@/composables/queries/variables'
import { useTableColumns } from '@/composables/useTableColumns'
import { loadVariablesList } from '@/loaders/variables'

import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'

import UBadge from '@nuxt/ui/components/Badge.vue'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-variables',
})

const variableQuery = useVariableQuery()
const { t } = useI18n()
const { data: items, isLoading, status, reload } = loadVariablesList()

const { tableColumnExpand, tableColumnActions } = useTableColumns<Variable>({
	moduleName: ModulesName.Variables,
	deleteFn: variableQuery.remove,
	onReload: reload,
})

const columns: TableColumn<Variable>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.variables.table.columns.name'),
	},
	{
		accessorKey: 'slug',
		header: t('pages.variables.table.columns.slug'),
	},
	{
		accessorKey: 'is_secret',
		header: t('pages.variables.table.columns.is_secret'),
		cell({ row }) {
			const label = row.getValue('is_secret') ? t('common.common.yes') : t('common.common.no')
			const color = row.getValue('is_secret') ? 'error' : 'success'
			const icon = row.getValue('is_secret') ? ICONS.misc.lock : ICONS.misc.lockOpen

			return h(UBadge, { label, color, icon })
		},
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
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="md:col-span-3 flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.variable.value') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon name="i-tabler-file-description" class="text-muted size-4" />
							<pre><ValueViewer :value="row.original.value" only-text /></pre>
						</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.variable.usage') }}</span>
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
		:module="ModulesName.Variables"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-variables-add' }"
	/>
	<Loading v-else-if="isLoading" what="variable" plural />
	<GeneralError v-else />
</template>
