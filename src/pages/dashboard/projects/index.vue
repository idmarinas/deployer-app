<script lang="ts">
import type { Project } from '@/types/tauri-types'
import type { TableColumn } from '@nuxt/ui'

import { h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProjectsList } from '@/loaders/projects'
import { useRouter } from 'vue-router'

import { useFrameworkBadge } from '@/composables/useFrameworkBadge'
import { useTableColumns } from '@/composables/useTableColumns'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-projects',
})

const UButton = resolveComponent('UButton')

const { t } = useI18n()
const router = useRouter()
const { data: items, isLoading, status, reload } = useProjectsList()

const { tableColumnEnabled, tableColumnActions } = useTableColumns<Project>({
	moduleName: 'projects',
	singularName: 'project',
	onReload: reload,
})

const columns: TableColumn<Project>[] = [
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.projects.table.columns.name'),
	},
	{
		accessorKey: 'git_url',
		header: t('pages.projects.table.columns.git_url'),
	},
	tableColumnEnabled,
	tableColumnActions(row => [
		{
			id: 'view',
			action: 'before',
			targetId: 'delete',
			vnode: () =>
				h(UButton, {
					color: 'neutral',
					variant: 'ghost',
					icon: ICONS.actions.view,
					async onClick() {
						router.push({ name: 'dashboard-projects-id', params: { id: row.original.id } })
					},
				}),
		},
		{
			id: 'no-edit',
			action: 'remove',
			targetId: 'edit',
		},
	]),
]
</script>

<template>
	<ListTable v-if="!isLoading && status === 'success' && items.length > 0" :columns="columns" :items="items">
		<template #expanded="{ row }">
			<ItemCard
				:id="row.original.id"
				:name="row.original.name"
				:description="row.original.description || undefined"
				:created_at="row.original.created_at"
				:updated_at="row.original.updated_at"
				:enabled="row.original.enabled"
			>
				<template #title-right>
					<component :is="useFrameworkBadge(row.original.framework, { size: undefined })" />
				</template>

				<template #default>
					<!-- Grid de detalles -->
					<div class="grid grid-cols-1 gap-6">
						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.project.git_url') }}</span>
							<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
								<UIcon :name="ICONS.framework.git" class="text-muted size-4" />
								{{ row.original.git_url }}
							</span>
						</div>

						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.project.local_working_dir') }}</span>
							<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
								<UIcon :name="ICONS.server.deviceDesktop" class="text-muted size-4" />
								{{ row.original.local_working_dir }}
							</span>
						</div>

						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted font-medium">{{ t('entity.project.remote_working_dir') }}</span>
							<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
								<UIcon :name="ICONS.server.server" class="text-muted size-4" />
								{{ row.original.remote_working_dir }}
							</span>
						</div>
					</div>
				</template>
			</ItemCard>
		</template>
	</ListTable>
	<Loading v-else-if="isLoading" what="project" plural />
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		module="projects"
		:add-route="{ name: 'dashboard-projects-add' }"
		:reload-fn="reload"
	/>
	<GeneralError v-else />
</template>
