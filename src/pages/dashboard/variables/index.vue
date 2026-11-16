<script lang="ts">
import type { Variable } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { computed, h, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useVariableQuery } from '@/composables/queries/variables'
import { useTableColumns } from '@/composables/useTableColumns'
import { useVariablesTrash } from '@/loaders/trash'
import { loadVariablesList } from '@/loaders/variables'

import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'
import { findVariableUsages } from '@/utils/interpolation/usages'

import UBadge from '@nuxt/ui/components/Badge.vue'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-variables',
})

const variableQuery = useVariableQuery()
const { t } = useI18n()
const { data: items, isLoading, status, reload, refresh } = loadVariablesList()
const trash = useVariablesTrash()

const trashCount = computed(() => trash.data.value?.length ?? 0)
const activeItems = computed(() => (items.value ?? []).filter(item => item.enabled))
const inactiveItems = computed(() => (items.value ?? []).filter(item => !item.enabled))

/** Pestaña seleccionada; el contenido se renderiza fuera de `UTabs` (ver `EntityListTab`). */
const tab = ref('active')
const isInactive = computed(() => tab.value === 'inactive')
const isTrash = computed(() => tab.value === 'trash')

/** Expresión de interpolación tal como debe escribirse en un comando. */
const usageOf = (slug: string) => `{{global.${slug}}}`

const { tableColumnExpand, tableColumnActions, tableColumnEnabled } = useTableColumns<Variable>({
	moduleName: ModulesName.Variables,
	deleteFn: variableQuery.remove,
	findVariableUsages,
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

	<TrashTable v-if="isTrash" :module="ModulesName.Variables" context="list" />

	<EntityListTab
		v-else
		:columns="columns"
		:items="isInactive ? inactiveItems : activeItems"
		:is-loading="isLoading"
		:status="status"
		:module="ModulesName.Variables"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-variables-add' }"
		:show-add="!isInactive"
		:title="isInactive ? t('components.empty_list.inactive.title') : undefined"
		:description="isInactive ? t('components.empty_list.inactive.description') : undefined"
		what="variable"
	>
		<template #expanded="{ row }">
			<ItemCard
				:id="row.original.id"
				:name="row.original.name"
				:description="row.original.description"
				:enabled="row.original.enabled"
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
	</EntityListTab>
</template>
