<script lang="ts">
import type { CommandResponse, HostPackage, HostServerUpdates, HostUpdateResult } from '@/types/tauri-types'
import type { TableColumn } from '@nuxt/ui'
import type { Row, TableMeta } from '@tanstack/vue-table'

import { computed, h, inject, Ref, ref, resolveComponent, useTemplateRef } from 'vue'

import { useI18n } from 'vue-i18n'

import { useConfirmDialog } from '@/composables/useDialog'
import { useTableColumns } from '@/composables/useTableColumns'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
const props = defineProps<{
	data: HostServerUpdates
	server_name: string
	server_id: number
}>()

const isOperating = inject<Ref<boolean>>('isOperating')!

const { t } = useI18n()
const toaster = useToaster()

const { tableColumnActions } = useTableColumns<HostPackage>()

const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const columns: TableColumn<HostPackage>[] = [
	{
		id: 'select',
		enableHiding: false,
		header: ({ table }) =>
			h(UCheckbox, {
				modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
				'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
				'aria-label': 'Select all',
			}),
		cell: ({ row }) =>
			h(UCheckbox, {
				modelValue: row.getIsSelected(),
				'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
				'aria-label': 'Select row',
			}),
	},
	{
		accessorKey: 'name',
		header: t('pages.hosts.manage.column_package'),
		meta: {
			class: {
				td: 'font-mono',
			},
		},
	},
	{
		accessorKey: 'current_version',
		header: t('pages.hosts.manage.column_current'),
		meta: {
			class: {
				td: 'text-muted',
			},
		},
	},
	{
		accessorKey: 'available_version',
		header: t('pages.hosts.manage.column_available'),
		meta: {
			class: {
				td: ({ row }) => {
					const updateType = (row.getValue('update_type') as string).toLocaleLowerCase()
					let color = ''

					switch (updateType) {
						case 'major':
							color = 'text-primary'
							break
						case 'minor':
							color = 'text-warning'
							break
						case 'patch':
							color = 'text-success'
							break
						default:
							color = ''
					}

					if (row.original.is_security) {
						color = 'text-error'
					}

					return `font-medium ${color}`
				},
			},
		},
	},
	{
		accessorKey: 'update_type',
		header: t('pages.hosts.manage.column_type'),
		cell: ({ row }) => {
			const updateType = (row.getValue('update_type') as string).toLocaleLowerCase()
			let icon = ''
			let color = ''

			switch (updateType) {
				case 'major':
					icon = 'i-tabler-plus'
					color = 'primary'
					break
				case 'minor':
					icon = 'i-tabler-minus'
					color = 'warning'
					break
				case 'patch':
					icon = 'i-tabler-bug'
					color = 'success'
					break
				default:
					icon = 'i-tabler-question-mark'
					color = 'neutral'
			}

			const slots = []

			if (row.original.is_security) {
				slots.push(
					h(UTooltip, { durationDelay: 0, text: t('common.semver.security') }, () =>
						h(UBadge, { icon: 'i-tabler-shield-lock', color: 'error' }),
					),
				)
			}

			slots.push(
				h(UBadge, { label: t(`common.semver.${updateType}`), icon, color, variant: 'outline', class: 'lowercase' }),
			)

			return h('div', { class: 'flex gap-2 items-center justify-end' }, slots)
		},
	},
	tableColumnActions(row => [
		{
			id: 'delete',
			action: 'remove',
		},
		{
			id: 'edit',
			action: 'remove',
		},
		{
			id: 'upgrade',
			icon: ICONS.actions.refresh,
			label: t('common.actions.refresh'),
			variant: 'ghost',
			tooltip: true,
			onClick: event => {
				event.preventDefault()

				return confirmUpdatePackages([row.original])
			},
		},
	]),
]

const tableMeta: TableMeta<HostPackage> = {
	class: {
		tr: (row: Row<HostPackage>) => {
			if (row.original.is_security) {
				return 'bg-error/5 hover:bg-error/10'
			}

			return ''
		},
	},
}

const table = useTemplateRef('table')
const rowsSelected = ref({})
const useSudo = ref(false)

const disableComponent = computed<boolean>(() => {
	return !props.data || !props.data.packages || props.data.packages.length === 0
})

async function confirmUpdatePackages(pkgs?: HostPackage[]) {
	const dialog = useConfirmDialog()

	if (pkgs?.length === 1) {
		const result = await dialog({
			title: t('dialogs.hosts.confirm_update.title', { count: 1, package: pkgs[0].name }),
			description: t('dialogs.hosts.confirm_update.description', {
				count: 1,
				package: pkgs[0],
				server_name: props.server_name,
			}),
			type: 'cancel_update',
		})

		if (result) {
			await doUpdatePackages([pkgs[0].name])
		}
	} else {
		let paquetes = pkgs!

		if (pkgs === undefined && props.data?.packages !== undefined) {
			paquetes = props.data.packages
		}

		const pkgNames = paquetes.map(pkg => pkg.name)

		const result = await dialog({
			title: t('dialogs.hosts.confirm_update.title', { count: paquetes.length }),
			description: t('dialogs.hosts.confirm_update.description', {
				count: paquetes.length,
				packages: paquetes,
				server_name: props.server_name,
			}),
			type: 'cancel_update',
		})

		if (result) {
			await doUpdatePackages(pkgNames)
		}
	}
}

async function doUpdatePackages(packageNames?: string[]) {
	if (packageNames !== undefined && packageNames.length === 0) return

	isOperating.value = true

	await invoke<CommandResponse<HostUpdateResult>>('host_update_packages', {
		input: {
			host_id: props.server_id,
			packages: packageNames || null,
			use_sudo: useSudo.value,
		},
	})
		.then(result => {
			if (result.success) {
				toaster.success(t('overlays.toast.title.completed'))
			} else {
				toaster.error(t('pages.hosts.toast.update_packages.error.title'))
			}
		})
		.catch(e => {
			toaster.error(t('overlays.toast.title.error'), String(e))
		})
		.finally(() => {
			isOperating.value = false
		})
}
</script>

<template>
	<div class="flex flex-col items-end gap-3 mb-3">
		<div class="text-muted">
			{{
				t('pages.hosts.manage.updates_summary', {
					total: data?.summary?.total || 0,
					security: data?.summary?.security || 0,
					major: data?.summary?.major || 0,
					minor: data?.summary?.minor || 0,
					patch: data?.summary?.patch || 0,
				})
			}}
		</div>
		<div class="flex gap-2 items-center justify-end">
			<UButton
				size="sm"
				color="warning"
				icon="i-tabler-download"
				:label="
					t('pages.hosts.manage.update_selected', {
						count: table?.tableApi.getFilteredSelectedRowModel().rows.length || 0,
					})
				"
				:disabled="disableComponent || isOperating || table?.tableApi.getFilteredSelectedRowModel().rows.length === 0"
				:loading="isOperating"
				@click="
					() => confirmUpdatePackages(table?.tableApi.getFilteredSelectedRowModel().rows.map(row => row.original))
				"
			/>
			<UButton
				size="sm"
				color="warning"
				icon="i-tabler-download"
				variant="outline"
				:disabled="disableComponent || isOperating || data?.packages.length === 0"
				:label="t('pages.hosts.manage.update_all', { count: data?.packages?.length || 0 })"
				:loading="isOperating"
				@click="() => confirmUpdatePackages()"
			/>
			<USwitch v-model="useSudo" :label="t('pages.hosts.manage.use_sudo')" />
		</div>
	</div>
	<UTable
		ref="table"
		sticky
		v-model:row-selection="rowsSelected"
		:columns="columns"
		:data="data?.packages || []"
		:meta="tableMeta"
		:empty="t('pages.hosts.manage.no_updates')"
	/>
</template>
