import type { TableColumn } from '@nuxt/ui'

import { h } from 'vue'

import { useConfirmDialog } from '@/composables/useDialog'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'

import { usePositionedButtons, type PositionedButton } from '@/composables/usePositionedButtons'
import { ICONS } from '@/utils/icons'
import useToaster from './useToaster'

export interface TableColumnsOptions {
	moduleName?: string
	deleteFn?: (id: number) => Promise<boolean>
	onReload?: () => Promise<void> | void
}

export function useTableColumns<T>(options?: TableColumnsOptions) {
	const { t } = useI18n()
	const router = useRouter()
	const toaster = useToaster()
	const confirmDialog = useConfirmDialog()

	const expandColumn: TableColumn<T> = {
		id: 'expand',
		enableHiding: false,
		cell: ({ row }) =>
			h(UButton, {
				color: 'neutral',
				variant: 'ghost',
				icon: row.getIsExpanded() ? ICONS.actions.viewOff : ICONS.actions.view,
				square: true,
				'aria-label': 'Expand',
				onClick: () => row.toggleExpanded(),
			}),
	}

	const enabledColumn: TableColumn<T> = {
		accessorKey: 'enabled',
		header: t('common.status.enabled'),
		cell({ row }) {
			const label = row.getValue('enabled') ? t('common.status.active') : t('common.status.inactive')
			const color = row.getValue('enabled') ? 'success' : 'error'
			const icon = row.getValue('enabled') ? ICONS.status.check : ICONS.status.cross

			return h(UBadge, { label, color, icon })
		},
	}

	const { resolveButtons } = usePositionedButtons()

	const actionsColumn = (extraButtons: (row: any) => PositionedButton[] = () => []): TableColumn<T> => ({
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) => {
			const defaultButtons: PositionedButton[] = []

			if (options?.moduleName && options?.deleteFn) {
				defaultButtons.push({
					id: 'edit',
					icon: ICONS.actions.edit,
					label: t('common.actions.edit'),
					color: 'info',
					variant: 'ghost',
					tooltip: true,
					onClick() {
						router.push({
							name: `dashboard-${options.moduleName}-id-edit` as any,
							params: { id: (row.original as any).id },
						})
					},
				})

				defaultButtons.push({
					id: 'delete',
					icon: ICONS.actions.delete,
					label: t('common.actions.delete'),
					color: 'error',
					variant: 'ghost',
					tooltip: true,
					async onClick() {
						const result = await confirmDialog({
							type: 'cancel_delete',
							title: t('common.confirm.delete.label'),
							description: t('common.confirm.delete.description', { name: (row.original as any).name }),
						})

						if (result) {
							const notice = toaster.warning(
								t(`notifications.${options.moduleName}.delete.loading.title`),
								t(`notifications.${options.moduleName}.delete.loading.description`, {
									name: (row.original as any).name,
								}),
								{
									icon: ICONS.actions.delete,
									duration: 0,
								},
							)

							const deleteResult = await options.deleteFn!((row.original as any).id)

							if (deleteResult) {
								toaster.toast.update(
									notice.id,
									toaster.success(
										t(`notifications.${options.moduleName}.delete.success.title`),
										t(`notifications.${options.moduleName}.delete.success.description`, {
											name: (row.original as any).name,
										}),
										{
											id: notice.id,
											duration: undefined,
										},
									),
								)
							} else {
								toaster.toast.update(
									notice.id,
									toaster.error(
										t(`notifications.${options.moduleName}.delete.error.title`),
										t(`notifications.${options.moduleName}.delete.error.description`, {
											name: (row.original as any).name,
										}),
										{
											id: notice.id,
											duration: undefined,
										},
									),
								)
							}

							if (options.onReload) {
								await options.onReload()
							}
						}
					},
				})
			}

			return h('div', { class: 'flex gap-2 justify-end' }, resolveButtons(defaultButtons, extraButtons(row)))
		},
	})

	return {
		tableColumnExpand: expandColumn,
		tableColumnEnabled: enabledColumn,
		tableColumnActions: actionsColumn,
	}
}
