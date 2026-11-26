import type { CrudReferenceMatch } from '@/composables/queries/shared.interfaces'
import type { VariableUsage } from '@/utils/interpolation/usages'
import type { TableColumn } from '@nuxt/ui'

import { h } from 'vue'

import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'

import { useCrudDeleteConfirm } from '@/composables/useCrudDeleteConfirm'
import { usePositionedButtons, type PositionedButton } from '@/composables/usePositionedButtons'
import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'

export interface TableColumnsOptions {
	moduleName?: ModulesName
	/**
	 * Nombre del param de ruta que identifica la fila (por defecto `id`).
	 * Para entidades con PK string (p. ej. `key` en commands) se usa el nombre
	 * de la columna: `dashboard-commands-key-edit` con param `key`.
	 */
	idParam?: string
	deleteFn?(id: number | string): Promise<boolean>
	/** Referencias entrantes de la fila (se listan antes de borrar). */
	findReferences?(id: number | string): Promise<CrudReferenceMatch[]>
	/** Usos de la variable global (por `slug`) en comandos activos. */
	findVariableUsages?(slug: string): Promise<VariableUsage[]>
	onReload?: () => Promise<void> | void
}

/**
 * Columna que alterna la fila expandible de `ListTable`.
 * El estado de expansión lo gestiona `ListTable` con `v-model:expanded`.
 */
export function createExpandColumn<T>(): TableColumn<T> {
	return {
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
}

export function useTableColumns<T>(options?: TableColumnsOptions) {
	const { t } = useI18n()
	const router = useRouter()
	const deleteConfirm = useCrudDeleteConfirm()

	const expandColumn = createExpandColumn<T>()

	const enabledColumn: TableColumn<T> = {
		accessorKey: 'enabled',
		header: () => t('common.status.enabled'),
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
				const idParam = options.idParam ?? 'id'

				defaultButtons.push({
					id: 'edit',
					icon: ICONS.actions.edit,
					label: t('common.actions.edit'),
					color: 'info',
					variant: 'ghost',
					tooltip: true,
					onClick() {
						router.push({
							name: `dashboard-${options.moduleName}-${idParam}-edit` as any,
							params: { [idParam]: (row.original as any)[idParam] } as any,
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
					disabled: (row.original as any)?.internal || false,
					async onClick() {
						const id = (row.original as any)[idParam] as number | string

						await deleteConfirm.softDelete({
							id,
							name: String((row.original as any).name ?? id),
							remove: options.deleteFn!,
							findReferences: options.findReferences ? () => options.findReferences!(id) : undefined,
							findVariableUsages: options.findVariableUsages
								? () =>
										options.findVariableUsages!(String((row.original as any).slug ?? (row.original as any).name ?? ''))
								: undefined,
							onDone: options.onReload,
						})
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
