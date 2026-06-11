<script lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CommandResponse, Host } from '@/types/tauri-types'

import { ref, useTemplateRef, resolveComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'

import { useToast } from '@nuxt/ui/composables'
import { useConfirmDialog } from '@/composables/useDialog'
import { useTableColumns } from '@/composables/useTableColumns'
import { useRouter } from 'vue-router'
import { useHostListAll } from '@/loaders/hosts'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-hosts',
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { t, locale } = useI18n()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const router = useRouter()
const { tableColumnExpand, tableColumnEnabled } = useTableColumns<Host>()

const { data: hosts, isLoading, reload } = useHostListAll()

const columns: TableColumn<Host>[] = [
	tableColumnExpand,
	{
		accessorKey: 'id',
		header: '#',
	},
	{
		accessorKey: 'name',
		header: t('pages.hosts.table.columns.name'),
	},
	{
		accessorKey: 'host',
		header: t('pages.hosts.table.columns.ip'),
	},
	{
		accessorKey: 'port',
		header: t('pages.hosts.table.columns.port'),
	},
	{
		accessorKey: 'auth_type',
		header: t('pages.hosts.table.columns.auth_type'),
		cell({ row }) {
			const label =
				row.getValue('auth_type') === 'password'
					? t('schemas.hosts.form.auth_type.select.password')
					: t('schemas.hosts.form.auth_type.select.key')
			const color = row.getValue('auth_type') === 'password' ? 'neutral' : 'info'
			const icon = row.getValue('auth_type') === 'password' ? 'i-tabler-password-user' : 'i-tabler-key'

			return h(UBadge, { label, color, icon })
		},
	},
	tableColumnEnabled,
	{
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) =>
			h('div', { class: 'flex gap-2 justify-end' }, [
				h(UButton, {
					icon: 'i-tabler-pencil',
					color: 'info',
					variant: 'ghost',
					async onClick() {
						router.push({ name: 'dashboard-hosts-id-edit', params: { id: row.original.id as number } })
					},
				}),
				h(UButton, {
					icon: 'i-tabler-plug',
					variant: 'ghost',
					color: 'neutral',
					async onClick() {
						const notice = toast.add({
							title: t('pages.hosts.toast.test_connection.loading.title'),
							description: t('pages.hosts.toast.test_connection.loading.description', { name: row.original.name }),
							color: 'warning',
							icon: 'i-tabler-plug',
							duration: 0,
						})

						const result = await invoke<CommandResponse<null>>('test_connection', { hostId: row.original.id })

						toast.remove(notice.id)
						if (result.success) {
							toast.add({
								title: t('pages.hosts.toast.test_connection.success.title'),
								description: t('pages.hosts.toast.test_connection.success.description', { name: row.original.name }),
								color: 'success',
								icon: 'i-tabler-check',
								duration: undefined,
							})
						} else {
							toast.add({
								title: t('pages.hosts.toast.test_connection.error.title'),
								description: t('pages.hosts.toast.test_connection.error.description', { name: row.original.name }),
								color: 'error',
								icon: 'i-tabler-x',
								duration: undefined,
							})
						}
					},
				}),
				h(UButton, {
					icon: 'i-tabler-trash',
					color: 'error',
					variant: 'ghost',
					async onClick() {
						const result = await confirmDialog({
							type: 'cancel_delete',
							title: t('common.delete.label'),
							description: t('common.delete.description', { name: row.original.name }),
						})

						if (result) {
							const notice = toast.add({
								title: t('pages.hosts.toast.delete.loading.title'),
								description: t('pages.hosts.toast.delete.loading.description', { name: row.original.name }),
								color: 'warning',
								icon: 'i-tabler-trash',
								duration: 0,
							})

							const result = await invoke<CommandResponse>('crud_delete_host', { id: row.original.id })

							if (result.success) {
								toast.update(notice.id, {
									title: t('pages.hosts.toast.delete.success.title'),
									description: t('pages.hosts.toast.delete.success.description', { name: row.original.name }),
									color: 'success',
									icon: 'i-tabler-check',
									duration: undefined,
								})
							} else {
								toast.update(notice.id, {
									title: t('pages.hosts.toast.delete.error.title'),
									description: t('pages.hosts.toast.delete.error.description', { name: row.original.name }),
									color: 'error',
									icon: 'i-tabler-x',
									duration: undefined,
								})
							}

							await reload()
						}
					},
				}),
			]),
	},
]

const table = useTemplateRef('table')
const columnVisibility = ref({})
const globalFilter = ref('')
const expanded = ref({})
</script>

<template>
	<div v-if="isLoading || hosts.length > 0" class="flex flex-col flex-1 w-full">
		<div class="flex py-3.5 border-b border-accented justify-between">
			<GlobalFilter v-model="globalFilter" />
			<ToogleColumVisibility :table-api="table?.tableApi" />
		</div>

		<UTable
			ref="table"
			sticky
			:loading="isLoading"
			v-model:expanded="expanded"
			v-model:global-filter="globalFilter"
			v-model:column-visibility="columnVisibility"
			:data="hosts"
			:columns="columns"
			:ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
		>
			<template #expanded="{ row }">
				<UCard :description="row.original.description || undefined">
					<template #title>
						<div class="flex items-center justify-between">
							<div class="flex gap-3 items-center">
								<UChip :color="row.original.enabled ? 'success' : 'neutral'" size="md">
									<span class="text-lg font-semibold">{{ row.original.name }}</span>
								</UChip>
								<UBadge color="neutral" variant="soft" size="sm" class="font-mono"> ID: {{ row.original.id }} </UBadge>
							</div>
							<UBadge
								:color="row.original.auth_type === 'password' ? 'neutral' : 'info'"
								variant="subtle"
								:icon="row.original.auth_type === 'password' ? 'i-tabler-password-user' : 'i-tabler-key'"
							>
								{{ t(`entity.host.${row.original.auth_type || 'auth_type'}`) }}
							</UBadge>
						</div>
					</template>

					<template #default>
						<!-- Grid de detalles -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.host.host') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-server" class="text-muted size-4" />
									{{ row.original.host }}
								</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.host.port') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-plug-connected" class="text-muted size-4" />
									{{ row.original.port }}
								</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">{{ t('entity.host.username') }}</span>
								<span class="text-sm font-mono text-foreground flex items-center gap-1.5">
									<UIcon name="i-tabler-user" class="text-muted size-4" />
									{{ row.original.username || '-' }}
								</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs text-muted font-medium">
									{{ row.original.auth_type === 'password' ? t('entity.host.password') : t('entity.host.key_id') }}
								</span>
								<span class="text-sm text-foreground flex items-center gap-1.5">
									<template v-if="row.original.auth_type === 'password'">
										<UIcon name="i-tabler-lock" class="text-muted size-4" />
										<span class="font-mono text-xs">••••••••</span>
									</template>
									<template v-else>
										<UIcon name="i-tabler-key" class="text-muted size-4" />
										<UBadge variant="subtle" size="sm" color="info" class="font-mono">
											ID: {{ row.original.key_id || '-' }}
										</UBadge>
									</template>
								</span>
							</div>
						</div>
					</template>

					<template #footer>
						<div class="flex gap-4 items-center justify-between text-xs text-muted">
							<span class="flex gap-1.5 items-center">
								<UIcon name="i-tabler-calendar-plus" class="size-4" />
								<strong>{{ t('entity.host.created_at') }}:</strong>
								{{
									new Date(row.original.created_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })
								}}
							</span>
							<span class="flex gap-1.5 items-center">
								<UIcon name="i-tabler-calendar-edit" class="size-4" />
								<strong>{{ t('entity.host.updated_at') }}:</strong>
								{{
									new Date(row.original.updated_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })
								}}
							</span>
						</div>
					</template>
				</UCard>
			</template>
		</UTable>
	</div>
	<UEmpty
		v-else
		icon="i-tabler-cloud-network"
		:title="t('pages.hosts.table.empty.title')"
		:description="t('pages.hosts.table.empty.description')"
		:actions="[
			{
				icon: 'i-tabler-plus',
				label: t('components.navigation.add.host.label'),
				to: { name: 'dashboard-hosts-add' },
			},
			{
				icon: 'i-tabler-refresh',
				label: t('common.refresh'),
				color: 'neutral',
				variant: 'soft',
				onClick: () => reload(),
			},
		]"
	/>
</template>
