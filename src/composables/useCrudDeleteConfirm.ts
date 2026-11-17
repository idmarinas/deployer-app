import type { CrudPurgeAllResult, CrudReferenceMatch, CrudRemoveOptions } from '@/composables/queries/shared.interfaces'
import type { VariableUsage } from '@/utils/interpolation/usages'

import { useConfirmDialog } from '@/composables/useDialog'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

/** Datos mínimos de la fila que se va a borrar. */
export interface CrudDeleteTarget {
	id: number | string
	name: string
	remove: (id: number | string, options?: CrudRemoveOptions) => Promise<boolean>
	/** Referencias entrantes declaradas por la entidad (FK). */
	findReferences?: () => Promise<CrudReferenceMatch[]>
	/** Usos de una variable global en textos interpolables. */
	findVariableUsages?: () => Promise<VariableUsage[]>
	/** Se ejecuta tras un borrado correcto (recargar listados, etc.). */
	onDone?: () => void | Promise<void>
}

/** Contexto de la acción de vaciado: página global de la papelera o pestaña Borrados de un listado. */
export type CrudPurgeAllScope = 'global' | 'list'

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		char =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			})[char]!,
	)
}

/**
 * Confirmaciones de borrado compartidas por los listados y la papelera.
 *
 * - Borrado lógico: si la fila tiene referencias o usos, el diálogo los lista y
 *   ofrece **Desvincular y eliminar** o **Eliminar de todos modos**.
 * - Purga: aviso irreversible; si hay referencias, se desvinculan antes.
 * - Vaciar papelera: confirmación doble (aviso + confirmación final).
 */
export function useCrudDeleteConfirm() {
	const confirmDialog = useConfirmDialog()
	const { t } = useI18n()
	const router = useRouter()

	function buildReferencesHtml(matches: CrudReferenceMatch[]): string {
		return matches
			.map(
				match =>
					`<li><strong>${escapeHtml(t(match.labelKey))}</strong>: ${match.rows
						.map(row => escapeHtml(row.name || String(row.id)))
						.join(', ')}</li>`,
			)
			.join('')
	}

	function buildUsagesHtml(usages: VariableUsage[]): string {
		return usages
			.map(usage => {
				const href = router.resolve({
					name: 'dashboard-commands-key-edit',
					params: { key: usage.key },
				}).href
				const expressions = usage.expressions.map(expression => `<code>${escapeHtml(expression)}</code>`).join(', ')

				return `<li><a href="${escapeHtml(href)}" class="underline">${escapeHtml(usage.name)}</a>: ${expressions}</li>`
			})
			.join('')
	}

	function buildGuardDescription(
		name: string,
		matches: CrudReferenceMatch[],
		usages: VariableUsage[],
	): string {
		const parts: string[] = []

		if (matches.length > 0) {
			parts.push(
				`<p>${escapeHtml(t('common.confirm.referenced.intro', { name }))}</p><ul>${buildReferencesHtml(matches)}</ul>`,
				`<p>${escapeHtml(t('common.confirm.referenced.suffix'))}</p>`,
			)
		}

		if (usages.length > 0) {
			parts.push(
				`<p>${escapeHtml(t('common.confirm.usages.intro', { name }))}</p><ul>${buildUsagesHtml(usages)}</ul>`,
				`<p>${escapeHtml(t('common.confirm.usages.suffix'))}</p>`,
			)
		}

		return parts.join('')
	}

	/** Borrado lógico (o físico si la entidad no tiene soft-delete). */
	async function softDelete(target: CrudDeleteTarget): Promise<boolean> {
		const matches = target.findReferences ? await target.findReferences() : []
		const usages = target.findVariableUsages ? await target.findVariableUsages() : []
		const guarded = matches.length > 0 || usages.length > 0

		const confirmed = await confirmDialog({
			type: guarded ? 'cancel_confirm' : 'cancel_delete',
			title: t('common.confirm.delete.label'),
			description: guarded
				? buildGuardDescription(target.name, matches, usages)
				: t('common.confirm.delete.description', { name: target.name }),
			confirmLabel:
				matches.length > 0
					? t('common.actions.unlink_delete')
					: usages.length > 0
						? t('common.actions.delete_anyway')
						: undefined,
		})

		if (!confirmed) return false

		const ok = await target.remove(target.id, matches.length > 0 ? { unlink: true } : undefined)
		if (ok) await target.onDone?.()

		return ok
	}

	/** Purga física de una fila que ya está en la papelera. */
	async function purge(target: CrudDeleteTarget): Promise<boolean> {
		const matches = target.findReferences ? await target.findReferences() : []
		const references = matches.length > 0 ? ` ${t('common.confirm.purge.referenced_suffix')}<ul>${buildReferencesHtml(matches)}</ul>` : ''

		const confirmed = await confirmDialog({
			type: 'cancel_delete',
			title: t('common.confirm.purge.label'),
			description: `${t('common.confirm.purge.description', { name: target.name })}${references}`,
			confirmLabel:
				matches.length > 0 ? t('common.actions.unlink_delete') : t('common.confirm.purge.label'),
		})

		if (!confirmed) return false

		const ok = await target.remove(target.id, { purge: true, unlink: matches.length > 0 })
		if (ok) await target.onDone?.()

		return ok
	}

	/** Vacía la papelera de una tabla con confirmación doble. */
	async function purgeAll(
		purgeDeleted: () => Promise<CrudPurgeAllResult>,
		onDone?: () => void | Promise<void>,
		scope: CrudPurgeAllScope = 'global',
	): Promise<boolean> {
		const isList = scope === 'list'

		const first = await confirmDialog({
			type: 'cancel_delete',
			title: t(isList ? 'common.confirm.purge_deleted.label' : 'common.confirm.purge_all.label'),
			description: t(isList ? 'common.confirm.purge_deleted.description' : 'common.confirm.purge_all.description'),
			confirmLabel: t('common.actions.continue'),
		})

		if (!first) return false

		const second = await confirmDialog({
			type: 'cancel_delete',
			title: t(isList ? 'common.confirm.purge_deleted.confirm_title' : 'common.confirm.purge_all.confirm_title'),
			description: t(
				isList
					? 'common.confirm.purge_deleted.confirm_description'
					: 'common.confirm.purge_all.confirm_description',
			),
			confirmLabel: t(isList ? 'common.actions.purge_deleted' : 'common.confirm.purge_all.label'),
		})

		if (!second) return false

		await purgeDeleted()
		await onDone?.()

		return true
	}

	return { softDelete, purge, purgeAll }
}
