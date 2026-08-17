import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { CommandResponse } from '@/types/tauri-types'
import type { Ref, ShallowRef } from 'vue'

import { usePositionedButtons } from '@/composables/usePositionedButtons'

import { isRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useConfirmDialog } from '@/composables/useDialog'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

import { invoke } from '@tauri-apps/api/core'

export function useToolbarButtons(moduleName: string, loading: Ref<boolean>) {
	const router = useRouter()
	const toaster = useToaster()
	const { t } = useI18n()
	const { resolveButtons } = usePositionedButtons()

	function useViewButtons(
		item: ShallowRef<{ name: string; id: number }>,
		buttons: PositionedButton[] = [],
		tooltip: boolean = false,
	) {
		const defaultBtns: PositionedButton[] = [
			{
				id: 'edit',
				icon: ICONS.actions.edit,
				color: 'info',
				variant: 'outline',
				label: t('common.actions.edit'),
				loading,
				tooltip,
				onClick() {
					router.push({
						name: `dashboard-${moduleName}-id-edit` as any,
						params: { id: item.value.id },
					})
				},
			},
			{
				id: 'delete',
				icon: ICONS.actions.delete,
				label: t('common.actions.delete'),
				color: 'error',
				loading,
				async onClick() {
					const dialog = useConfirmDialog()

					const result = await dialog({
						title: t('common.confirm.delete.label'),
						description: t('common.confirm.delete.description', { name: item.value.name }),
						type: 'cancel_delete',
					})

					if (result) {
						const notice = toaster.warning(
							t(`notifications.${moduleName}.delete.loading.title`),
							t(`notifications.${moduleName}.delete.loading.description`, { name: item.value.name }),
							{ duration: 0 },
						)

						// TODO: usar `crud_delete_${moduleName}` en vez de 'crud_delete_project' (bug preexistente)
						const result = await invoke<CommandResponse>(`crud_delete_${moduleName}`, { id: item.value.id })

						if (result.success) {
							toaster.toast.update(
								notice.id,
								toaster.success(
									t(`notifications.${moduleName}.delete.success.title`),
									t(`notifications.${moduleName}.delete.success.description`, { name: item.value.name }),
									{ id: notice.id, duration: undefined },
								),
							)
						} else {
							toaster.toast.update(
								notice.id,
								toaster.error(
									t(`notifications.${moduleName}.delete.error.title`),
									t(`notifications.${moduleName}.delete.error.description`, { name: item.value.name }),
									{ id: notice.id, duration: undefined },
								),
							)
						}

						await router.push({ name: `dashboard-${moduleName}` as any })
					}
				},
				tooltip,
			},
			{
				id: 'list',
				icon: 'i-tabler-list',
				label: t('common.back.list'),
				loading,
				tooltip,
				async onClick() {
					router.push({ name: `dashboard-${moduleName}` } as any)
				},
			},
			{
				id: 'cancel',
				icon: ICONS.actions.cancel,
				label: t('common.actions.cancel'),
				variant: 'outline',
				color: 'neutral',
				loading,
				tooltip,
				onClick: () => router.back(),
			},
		]

		return resolveButtons(defaultBtns, buttons)
	}

	type ToolbarButtonFactory = Record<string, (row: any, opts?: Omit<PositionedButton, 'id'>) => PositionedButton>

	function useButtons(): Record<string, ToolbarButtonFactory> {
		const hostsTestConnection = (row: Ref | object, opts: Omit<PositionedButton, 'id'> = {}): PositionedButton => {
			return {
				id: 'test-conection',
				icon: ICONS.server.plug,
				label: t('pages.hosts.manage.test_connection'),
				loading,
				...opts,
				async onClick() {
					const item = (isRef(row) ? row.value : row) as any
					const notice = toaster.warning(
						t('notifications.hosts.test_connection.loading.title'),
						t('notifications.hosts.test_connection.loading.description', { name: item.name }),
						{
							icon: ICONS.server.plug,
							duration: 0,
						},
					)

					const result = await invoke<CommandResponse<null>>('test_connection', { hostId: item.id })

					if (result.success) {
						toaster.toast.update(
							notice.id,
							toaster.success(
								t('notifications.hosts.test_connection.success.title'),
								t('notifications.hosts.test_connection.success.description', { name: item.name }),
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
								t('notifications.hosts.test_connection.error.title'),
								t('notifications.hosts.test_connection.error.description', {
									name: item.name,
									...result.message_params,
								}),
								{
									id: notice.id,
									duration: undefined,
								},
							),
						)
					}
				},
			}
		}

		return {
			hosts: {
				testConnection: hostsTestConnection,
			},
		}
	}

	return {
		useViewButtons,
		useButtons,
	}
}
