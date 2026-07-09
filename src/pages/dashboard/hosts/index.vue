<script lang="ts">
import type { CommandResponse, Host } from '@/types/tauri-types'
import type { TableColumn } from '@nuxt/ui'

import { h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTableColumns } from '@/composables/useTableColumns'
import { useHostListAll } from '@/loaders/hosts'
import { ICONS } from '@/utils/icons'
import { useToast } from '@nuxt/ui/composables'

import { invoke } from '@tauri-apps/api/core'

import ViewValue from '@/components/ViewValue.vue'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-hosts',
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { data: items, isLoading, status, reload } = useHostListAll()

const { t } = useI18n()
const toast = useToast()
const { tableColumnExpand, tableColumnEnabled, tableColumnActions } = useTableColumns<Host>({
	moduleName: 'hosts',
	singularName: 'host',
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
		header: t('pages.hosts.table.columns.name'),
		cell: ({ row }) => h(ViewValue, { value: row.getValue('name') as string }),
	},
	{
		accessorKey: 'host',
		header: t('pages.hosts.table.columns.ip'),
		cell: ({ row }) => h(ViewValue, { value: row.getValue('host') as string }),
	},
	{
		accessorKey: 'port',
		header: t('pages.hosts.table.columns.port'),
		cell: ({ row }) => h(ViewValue, { value: row.getValue('port') as number }),
	},
	{
		accessorKey: 'auth_type',
		header: t('pages.hosts.table.columns.auth_type'),
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
			id: 'test-conection',
			action: 'after',
			targetId: 'edit',
			vnode: () =>
				h(UButton, {
					icon: ICONS.server.plug,
					variant: 'ghost',
					color: 'neutral',
					async onClick() {
						const notice = toast.add({
							title: t('pages.hosts.toast.test_connection.loading.title'),
							description: t('pages.hosts.toast.test_connection.loading.description', { name: row.original.name }),
							color: 'warning',
							icon: ICONS.server.plug,
							duration: 0,
						})

						const result = await invoke<CommandResponse<null>>('test_connection', { hostId: row.original.id })

						toast.remove(notice.id)
						if (result.success) {
							toast.add({
								title: t('pages.hosts.toast.test_connection.success.title'),
								description: t('pages.hosts.toast.test_connection.success.description', {
									name: row.original.name,
								}),
								color: 'success',
								icon: ICONS.status.check,
								duration: undefined,
							})
						} else {
							toast.add({
								title: t('pages.hosts.toast.test_connection.error.title'),
								description: t('pages.hosts.toast.test_connection.error.description', { name: row.original.name }),
								color: 'error',
								icon: ICONS.status.cross,
								duration: undefined,
							})
						}
					},
				}),
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
				:description="row.original.description"
				:created_at="row.original.created_at"
				:updated_at="row.original.updated_at"
			>
				<!-- Grid de detalles -->
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.host') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.server.server" class="text-muted size-4" />
							<ViewValue :value="row.original.host" :only-text="true" />
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.port') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.server.plugConnected" class="text-muted size-4" />
							<ViewValue :value="row.original.port" :only-text="true" />
						</span>
					</div>

					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted font-medium">{{ t('entity.host.username') }}</span>
						<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
							<UIcon :name="ICONS.auth.user" class="text-muted size-4" />
							<ViewValue :value="row.original.username" :only-text="true" />
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
	</ListTable>
	<EmptyList
		v-else-if="!isLoading && status === 'success' && items.length === 0"
		module="hosts"
		:add-route="{ name: 'dashboard-hosts-add' }"
		:reload-fn="reload"
	/>
	<Loading v-else-if="isLoading" what="host" plural />
	<GeneralError v-else />
</template>
