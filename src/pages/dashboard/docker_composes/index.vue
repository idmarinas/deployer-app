<script lang="ts">
import type { DockerComposeListItem } from '@/loaders/docker_composes'
import type { TableColumn } from '@nuxt/ui'

import { h, onMounted, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useTableColumns } from '@/composables/useTableColumns'
import { useQuery } from '@/composables/useQuery'
import { useDockerComposeListAll } from '@/loaders/docker_composes'
import { ICONS } from '@/utils/icons'

import ValueViewer from '@/components/view/ValueViewer.vue'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-docker_composes',
})

const UBadge = resolveComponent('UBadge')
const router = useRouter()

const { data: items, isLoading, status, reload, refresh } = useDockerComposeListAll()

const { t } = useI18n()
const { dockerComposes: dockerComposeQuery } = useQuery()
const { tableColumnExpand, tableColumnEnabled, tableColumnActions } = useTableColumns<DockerComposeListItem>({
	moduleName: 'docker_composes',
	deleteFn: dockerComposeQuery.remove,
	onReload: reload,
})

const columns: TableColumn<DockerComposeListItem>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.docker_composes.table.columns.name'),
		cell: ({ row }) => h(ValueViewer, { value: row.getValue('name') as string }),
	},
	{
		accessorKey: 'host_name',
		header: t('pages.docker_composes.table.columns.host'),
		cell: ({ row }) => {
			const name = row.getValue('host_name') as string | null
			return h(UBadge, { label: name ?? '-', color: name ? 'info' : 'neutral', variant: 'subtle' })
		},
	},
	{
		accessorKey: 'remote_path',
		header: t('pages.docker_composes.table.columns.remote_path'),
		cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.getValue('remote_path') as string),
	},
	tableColumnEnabled,
	tableColumnActions(row => [
		{
			id: 'manage',
			action: 'before',
			targetId: 'edit',
			vnode: () =>
				h(resolveComponent('UButton'), {
					icon: ICONS.actions.view,
					color: 'success',
					variant: 'ghost',
					onClick() {
						router.push({ name: 'dashboard-docker_composes-id', params: { id: row.original.id } })
					},
				}),
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
				:id="row.original.id"
				:name="row.original.name"
				:description="row.original.description"
				:created_at="row.original.created_at"
				:updated_at="row.original.updated_at"
			>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.docker_compose.host_id') }}</span>
						<span class="text-sm text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.server.server" class="text-muted size-4" />
							{{ row.original.host_name ?? '-' }}
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.docker_compose.remote_path') }}</span>
						<span class="text-sm font-mono text-foreground">{{ row.original.remote_path }}</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.docker_compose.files_count') }}</span>
						<span class="text-sm text-muted flex items-center gap-2">
							<UIcon name="i-tabler-files" /> {{ row.original.files_count }}
						</span>
					</div>
				</div>
			</ItemCard>
		</template>
	</ListTable>
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		module="docker_composes"
		:add-route="{ name: 'dashboard-docker_composes-add' }"
		:reload-fn="reload"
	/>
	<Loading v-else-if="isLoading" what="docker_compose" plural />
	<GeneralError v-else />
</template>