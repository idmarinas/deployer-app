<script lang="ts">
import type { Host } from '@/types/entities'
import type { TableColumn } from '@nuxt/ui'

import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useTableColumns } from '@/composables/useTableColumns'
import { useHostListAll } from '@/loaders/hosts'
import { useHostsTrash } from '@/loaders/trash'
import { ICONS } from '@/utils/icons'

import ValueViewer from '@/components/view/ValueViewer.vue'
import { useToolbarButtons } from '@/composables/dashboard/toolbar/useToolbarButtons'
import { useHostQuery } from '@/composables/queries/hosts'
import { ModulesName } from '@/utils/deployer-app'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-hosts',
})

const UBadge = resolveComponent('UBadge')

const { data: items, isLoading, status, reload } = useHostListAll()
const { t } = useI18n()
const trash = useHostsTrash()

const trashCount = computed(() => trash.data.value?.length ?? 0)
const activeItems = computed(() => (items.value ?? []).filter(item => item.enabled))
const inactiveItems = computed(() => (items.value ?? []).filter(item => !item.enabled))

/** Pestaña seleccionada; el contenido se renderiza fuera de `UTabs` (ver `EntityListTab`). */
const tab = ref('active')
const isInactive = computed(() => tab.value === 'inactive')
const isTrash = computed(() => tab.value === 'trash')

/** Color del indicador según la pestaña activa (verde/ámbar/rojo). */
const tabColor = computed(() => (isTrash.value ? 'error' : isInactive.value ? 'warning' : 'success'))

const router = useRouter()
const hostQuery = useHostQuery()
const { useButtons } = useToolbarButtons(ModulesName.Hosts, isLoading, hostQuery.remove)
const { hostButtons } = useButtons()
const { tableColumnExpand, tableColumnEnabled, tableColumnActions } = useTableColumns<Host>({
	moduleName: ModulesName.Hosts,
	deleteFn: hostQuery.remove,
	onReload: reload,
})

const columns: TableColumn<Host>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: () => t('pages.hosts.table.columns.name'),
		cell: ({ row }) => h(ValueViewer, { value: row.getValue('name') as string }),
	},
	{
		accessorKey: 'host',
		header: () => t('pages.hosts.table.columns.ip'),
		cell: ({ row }) => h(ValueViewer, { value: row.getValue('host') as string }),
	},
	{
		accessorKey: 'port',
		header: () => t('pages.hosts.table.columns.port'),
		cell: ({ row }) => h(ValueViewer, { value: row.getValue('port') as number }),
	},
	{
		accessorKey: 'auth_type',
		header: () => t('pages.hosts.table.columns.auth_type'),
		cell({ row }) {
			const label =
				row.getValue('auth_type') === 'password'
					? t('form.hosts.auth_type.select.password')
					: t('form.hosts.auth_type.select.key')
			const color = row.getValue('auth_type') === 'password' ? 'neutral' : 'info'
			const icon = row.getValue('auth_type') === 'password' ? ICONS.auth.passwordUser : ICONS.auth.key

			return h(UBadge, { label, color, icon })
		},
	},
	tableColumnEnabled,
	tableColumnActions(row => [
		{
			id: 'manage',
			action: 'before',
			targetId: 'edit',
			label: t('common.actions.view'),
			icon: ICONS.actions.view,
			tooltip: true,
			color: 'success',
			variant: 'ghost',
			onClick: () => router.push({ name: 'dashboard-hosts-id', params: { id: row.original.id } }),
		},
		hostButtons.testConnection(row.original, {
			action: 'after',
			targetId: 'edit',
			variant: 'ghost',
			color: 'neutral',
			tooltip: true,
		}),
	]),
]

onMounted(() => {
	reload()
})
</script>

<template>
	<UTabs
		v-model="tab"
		:content="false"
		:color="tabColor"
		:items="[
			{
				label: t('common.tabs.active'),
				icon: ICONS.status.check,
				value: 'active',
			},
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

	<TrashTable v-if="isTrash" :module="ModulesName.Hosts" context="list" />

	<EntityListTab
		v-else
		:columns="columns"
		:items="isInactive ? inactiveItems : activeItems"
		:is-loading="isLoading"
		:status="status"
		:module="ModulesName.Hosts"
		:reload-fn="reload"
		:add-route="{ name: 'dashboard-hosts-add' }"
		:show-add="!isInactive"
		:title="isInactive ? t('components.empty_list.inactive.title') : undefined"
		:description="isInactive ? t('components.empty_list.inactive.description') : undefined"
		what="host"
	>
		<template #expanded="{ row }">
			<ItemCard v-model="row.original">
				<!-- Grid de detalles -->
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.host') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.server.server" class="text-muted size-4" />
							<ValueViewer :value="row.original.host" :only-text="true" />
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.port') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.server.plugConnected" class="text-muted size-4" />
							<ValueViewer :value="row.original.port" :only-text="true" />
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.username') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.auth.user" class="text-muted size-4" />
							<ValueViewer :value="row.original.username" :only-text="true" />
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">
							{{ row.original.auth_type === 'password' ? t('entity.host.password') : t('entity.host.key_id') }}
						</span>
						<span class="text-sm text-foreground flex items-center gap-1.5">
							<template v-if="row.original.auth_type === 'password'">
								<UIcon :name="ICONS.auth.lock" class="text-muted size-4" />
								<span class="font-mono text-xs">••••••••</span>
							</template>
							<template v-else>
								<UIcon :name="ICONS.auth.key" class="text-muted size-4" />
								<UBadge variant="subtle" size="sm" color="info" class="font-mono">
									ID: {{ row.original.key_id || '-' }}
								</UBadge>
							</template>
						</span>
					</div>
				</div>
			</ItemCard>
		</template>
	</EntityListTab>
</template>
