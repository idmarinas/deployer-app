<script lang="ts">
import type { TableColumn } from '@nuxt/ui'

import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'

import UBadge from '@nuxt/ui/components/Badge.vue'

import { useCrudByModule } from '@/composables/queries/registry'
import { useCrudDeleteConfirm } from '@/composables/useCrudDeleteConfirm'
import { usePositionedButtons } from '@/composables/usePositionedButtons'
import { createExpandColumn } from '@/composables/useTableColumns'
import { useTrashLoader } from '@/loaders/trash'
import { ModulesName } from '@/utils/deployer-app'
import { getModuleIcon, ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		module: ModulesName
		/** Muestra el nombre de la entidad junto al contador. */
		showHeader?: boolean
		/** Contexto de uso: página global de la papelera o pestaña Borrados de un listado. */
		context?: 'global' | 'list'
	}>(),
	{
		showHeader: true,
		context: 'global',
	},
)

const { t, locale } = useI18n()
const deleteConfirm = useCrudDeleteConfirm()
const { resolveButtons } = usePositionedButtons()

const { api, idField } = useCrudByModule(props.module)
const { data: items, isLoading, status, reload } = useTrashLoader(props.module)

const rows = computed(() => (items.value ?? []) as Record<string, any>[])
const isList = computed(() => props.context === 'list')
const emptyTitle = computed(() =>
	t(isList.value ? 'components.trash.empty.list_title' : 'components.trash.empty.title'),
)
const purgeAllLabel = computed(() => t(isList.value ? 'common.actions.purge_deleted' : 'common.actions.purge_all'))

function idOf(row: Record<string, any>): number | string {
	return row[idField] as number | string
}

function nameOf(row: Record<string, any>): string {
	return String(row.name ?? idOf(row))
}

function deletedAtOf(row: Record<string, any>): string {
	const value = row.deleted_at as string | null

	return value ? new Date(value).toLocaleString(locale.value, { dateStyle: 'long', timeStyle: 'short' }) : '—'
}

async function restore(row: Record<string, any>): Promise<void> {
	await api.restore(idOf(row))
	await reload()
}

async function purge(row: Record<string, any>): Promise<void> {
	await deleteConfirm.purge({
		id: idOf(row),
		name: nameOf(row),
		remove: api.remove,
		findReferences: () => api.findReferences(idOf(row)),
		onDone: reload,
	})
}

async function purgeAll(): Promise<void> {
	await deleteConfirm.purgeAll(
		() => api.purgeDeleted(),
		() => reload(),
		props.context,
	)
}

const columns: TableColumn<Record<string, any>>[] = [
	createExpandColumn<Record<string, any>>(),
	{
		accessorKey: 'name',
		header: () => t('entity.common.name'),
	},
	{
		id: 'id',
		header: () => '#',
		cell: ({ row }) => h(UBadge, { label: String(idOf(row.original)), color: 'neutral', variant: 'soft' }),
	},
	{
		accessorKey: 'deleted_at',
		header: () => t('components.trash.columns.deleted_at'),
		cell: ({ row }) => deletedAtOf(row.original),
	},
	{
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) =>
			h(
				'div',
				{ class: 'flex gap-2 justify-end' },
				resolveButtons([
					{
						id: 'restore',
						icon: ICONS.actions.restore,
						label: t('common.actions.restore'),
						color: 'success',
						variant: 'ghost',
						tooltip: true,
						onClick: () => {
							void restore(row.original)
						},
					},
					{
						id: 'purge',
						icon: ICONS.actions.purge,
						label: t('common.actions.purge'),
						color: 'error',
						variant: 'ghost',
						tooltip: true,
						onClick: () => {
							void purge(row.original)
						},
					},
				]),
			),
	},
]
</script>

<template>
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-2">
			<div v-if="showHeader" class="flex items-center gap-2">
				<UIcon :name="getModuleIcon(module)" class="text-muted size-5" />
				<span class="font-semibold">{{ t(`pages.${module}.title`) }}</span>
				<UBadge color="neutral" variant="soft" :label="String(rows.length)" />
			</div>
			<div v-else class="flex items-center gap-2">
				<UBadge color="neutral" variant="soft" :label="String(rows.length)" />
			</div>

			<UButton
				v-if="rows.length > 0"
				:icon="ICONS.actions.purge"
				:label="purgeAllLabel"
				color="error"
				variant="soft"
				@click="purgeAll"
			/>
		</div>

		<ListTable v-if="rows.length > 0" :columns="columns" :items="rows">
			<template #expanded="{ row }">
				<TrashDetails :module="module" :item="row.original" />
			</template>
		</ListTable>

		<UEmpty
			v-else-if="!isLoading && status === 'success'"
			icon="i-tabler-trash"
			:title="emptyTitle"
			:description="t('components.trash.empty.description')"
			class="py-6"
		/>
		<Loading v-else-if="isLoading" what="trash" plural />
		<GeneralError v-else />
	</div>
</template>
