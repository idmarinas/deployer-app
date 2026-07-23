import type { ButtonProps } from '@nuxt/ui'
import type { VNode } from 'vue'

import { h } from 'vue'

import UButton from '@nuxt/ui/components/Button.vue'
import UTooltip from '@nuxt/ui/components/Tooltip.vue'

export type PositionAction = 'before' | 'after' | 'replace' | 'remove' | 'append' | 'prepend'

export interface PositionedButton extends ButtonProps {
	/** Identificador único del botón (ej. 'submit', 'reset', 'cancel') */
	id: string
	/** Función que devuelve el VNode del botón. Es opcional porque acciones como 'remove' no lo necesitan. */
	vnode?: (btn?: PositionedButton) => VNode
	/** Acción a realizar con este botón respecto a la lista. Por defecto es 'append'. */
	action?: PositionAction
	/** ID del botón objetivo para las acciones relativas ('before', 'after', 'replace'). Si no se indica, suele usarse el propio `id`. */
	targetId?: string
	// Permite mostrar el botón como un icono con tooltip
	tooltip?: boolean
}

/**
 * Composable para gestionar listas de botones u otros VNodes posicionados dinámicamente.
 * Permite definir una lista por defecto y procesar "botones extra" que se inyectan, reemplazan o borran
 * en función de sus reglas de posición.
 */
export function usePositionedButtons() {
	function createButton(btn: PositionedButton): VNode {
		return h(UTooltip, { text: btn.label, delayDuration: 0, disabled: !btn.tooltip }, () =>
			h(UButton, {
				icon: btn.icon,
				label: btn.tooltip ? undefined : btn.label, // si hay tooltip, no mostramos texto
				color: btn.color,
				variant: btn.variant,
				loading: btn.loading,
				onClick: btn.onClick,
			}),
		)
	}

	/**
	 * Construye y devuelve la lista final de VNode resolviendo las acciones de los botones extra
	 * sobre la lista de botones por defecto.
	 */
	function resolveButtons(defaults: PositionedButton[], extras: PositionedButton[] = []): VNode[] {
		let result: PositionedButton[] = [...defaults]

		for (const extra of extras) {
			const action = extra.action || 'append'
			// Para acciones como replace o remove, si no hay targetId explícito, asumimos que es el propio id
			const target = extra.targetId || extra.id

			switch (action) {
				case 'append':
					result.push(extra)
					break
				case 'prepend':
					result.unshift(extra)
					break
				case 'remove':
					result = result.filter(b => b.id !== target)
					break
				case 'replace': {
					const index = result.findIndex(b => b.id === target)
					if (index !== -1) {
						result[index] = extra
					} else {
						// Si no lo encuentra para reemplazar, por fallback lo añadimos al final
						result.push(extra)
					}
					break
				}
				case 'before': {
					const index = result.findIndex(b => b.id === target)
					if (index !== -1) {
						result.splice(index, 0, extra)
					} else {
						result.push(extra)
					}
					break
				}
				case 'after': {
					const index = result.findIndex(b => b.id === target)
					if (index !== -1) {
						result.splice(index + 1, 0, extra)
					} else {
						result.push(extra)
					}
					break
				}
			}
		}

		// Extraemos los VNodes, omitiendo los nulos (ej. si algún vnode no devolvió nada o no tiene vnode definido)
		return result.map(b => (b.vnode ? b.vnode(b) : createButton(b)))
	}

	return {
		resolveButtons,
	}
}
