<script lang="ts">
import type { Variable } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { h, onMounted } from 'vue'
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
const { data: items, isLoading, status, reload, refresh } = loadVariablesList()

/** Expresión de interpolación tal como debe escribirse en un comando. */
const usageOf = (slug: string) => `{{global.${slug}}}`

const { tableColumnExpand, tableColumnActions, tableColumnEnabled } = useTableColumns<Variable>({
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
	tableColumnEnabled,
	tableColumnActions(),
]

onMounted(() => {
	refresh()
})
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
				<!-- Dos columnas a los extremos; el espacio central es flexible y, si no cabe, la segunda baja. -->
				<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.variable.value') }}</span>
						<span class="flex items-start gap-1.5 text-sm font-mono text-foreground">
							<UIcon name="i-tabler-file-description" class="text-muted size-4 shrink-0" />
							<ValueViewer :value="row.original.value" only-text />
						</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.variable.usage') }}</span>
						<span class="flex items-center gap-1.5 text-sm font-mono text-foreground">
							<UIcon name="i-tabler-variable" class="text-muted size-4 shrink-0" />
							<code class="truncate">{{ usageOf(row.original.slug) }}</code>
							<Clipboard :source="usageOf(row.original.slug)" only-icon size="xs" class="shrink-0" />
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
