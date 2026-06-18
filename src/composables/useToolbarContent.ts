import type { Ref, ShallowRef, VNode } from 'vue'
import type { Form } from '@nuxt/ui'

import { h, isRef } from 'vue'
import { useI18n } from 'vue-i18n'

import UButton from '@nuxt/ui/components/Button.vue'
import USwitch from '@nuxt/ui/components/Switch.vue'
import { Icon } from '@iconify/vue'

import { useRouter } from 'vue-router'
import { ToolbarManager } from './useDashboardToolbar'

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Posiciones disponibles para botones extra en la zona derecha del toolbar */
export type ExtraButtonPosition =
	| 'before-submit'
	| 'after-submit'
	| 'before-reset'
	| 'after-reset'
	| 'before-cancel'
	| 'after-cancel'

/** Botón adicional que una página hija puede inyectar en el toolbar.
 *  `vnode` es una función para que se evalúe en cada render y los
 *  valores reactivos (como `loading`) se reflejen correctamente.
 */
export interface ExtraButton {
	/** Identificador único del botón (para debug y futuras extensiones) */
	id: string
	/** Posición nombrada dentro de la zona derecha del toolbar */
	position: ExtraButtonPosition
	/** Función que devuelve el VNode — usar `() => h(UButton, { ... })` en la página hija */
	vnode: () => VNode
}

function getIcon(moduleName: string, isIconify = false): { uncheckedIcon: string; checkedIcon: string } {
	const icons: Record<string, { uncheckedIcon: string; checkedIcon: string }> = {
		hosts: {
			uncheckedIcon: 'i-tabler-server-off',
			checkedIcon: 'i-tabler-server',
		},
		projects: {
			uncheckedIcon: 'i-tabler-package-off',
			checkedIcon: 'i-tabler-package',
		},
		deployments: {
			uncheckedIcon: 'i-tabler-send-off',
			checkedIcon: 'i-tabler-send',
		},
		variables: {
			uncheckedIcon: 'i-tabler-variable-off',
			checkedIcon: 'i-tabler-variable',
		},
		passkeys: {
			uncheckedIcon: 'i-tabler-key-off',
			checkedIcon: 'i-tabler-key',
		},
		tasks: {
			uncheckedIcon: 'i-tabler-x',
			checkedIcon: 'i-tabler-check',
		},
		default: {
			checkedIcon: 'i-tabler-check',
			uncheckedIcon: 'i-tabler-x',
		},
	}

	const icon = icons[moduleName] ?? icons['default']

	if (isIconify) {
		return {
			uncheckedIcon: icon.uncheckedIcon.replace('i-tabler-', 'tabler:'),
			checkedIcon: icon.checkedIcon.replace('i-tabler-', 'tabler:'),
		}
	}

	return icon
}

// ---------------------------------------------------------------------------
// Función interna principal
// ---------------------------------------------------------------------------

function useToolbarContent(
	state: Ref<{ enabled: boolean }>,
	initialState: Ref | object,
	loading: Ref<boolean>,
	form: ShallowRef<Form<any> | null>,
	type: 'add' | 'edit',
	manager?: ToolbarManager,
	extraButtons: ExtraButton[] = [],
) {
	const { t } = useI18n()
	const router = useRouter()

	// ---------------------------------------------------------------------------
	// Helper interno: intercala botones extra en las posiciones indicadas
	// ---------------------------------------------------------------------------

	function builButtonsZone(): VNode[] {
		const at = (position: ExtraButtonPosition): VNode[] =>
			extraButtons.filter(b => b.position === position).map(b => b.vnode())

		return [
			...at('before-submit'),
			h(UButton, {
				label: t(`components.form.${type === 'edit' ? 'save' : 'submit'}`),
				icon: type === 'edit' ? 'i-tabler-device-floppy' : 'i-tabler-send',
				loading: loading.value,
				class: 'first:mr-10',
				onClick: () => form.value?.submit(),
			}),
			...at('after-submit'),
			...at('before-reset'),
			h(UButton, {
				label: t('components.form.reset'),
				icon: 'i-tabler-refresh',
				variant: 'soft',
				loading: loading.value,
				onClick: () => {
					state.value = (isRef(initialState) ? initialState.value : initialState) as any
					form.value?.clear()
				},
			}),
			...at('after-reset'),
			...at('before-cancel'),
			h(UButton, {
				label: t('components.form.cancel'),
				icon: 'i-tabler-cancel',
				variant: 'outline',
				color: 'neutral',
				loading: loading.value,
				onClick: () => router.back(),
			}),
			...at('after-cancel'),
		]
	}

	if (!manager) {
		return
	}

	manager.setToolbarFn(() => [
		h('h2', { class: 'flex gap-2 items-center' }, [
			h(USwitch, {
				modelValue: state.value.enabled,
				uncheckedIcon: getIcon(manager.moduleName).uncheckedIcon,
				checkedIcon: getIcon(manager.moduleName).checkedIcon,
				loading: loading.value,
				size: 'xl',
				'onUpdate:modelValue': (value: unknown) => {
					state.value.enabled = value as boolean
					manager.updateToolbar()
				},
			}),
			h('span', { class: 'flex flex-col' }, [
				h('span', {}, t(`schemas.${manager.moduleName}.form.title.${type}`)),
				h(
					'span',
					{
						class: `text-sm ${state.value.enabled ? 'text-green-600' : 'text-red-600'}`,
					},
					state.value.enabled ? t('common.active') : t('common.inactive'),
				),
			]),
		]),
		h('div', { class: 'flex gap-2 items-center' }, builButtonsZone()),
	])
}

// ---------------------------------------------------------------------------
// Exports públicos
// ---------------------------------------------------------------------------

export function useToolbarContentCreate(
	state: Ref<{ enabled: boolean }>,
	initialState: Ref | object,
	loading: Ref<boolean>,
	form: ShallowRef<Form<any> | null>,
	manager?: ToolbarManager,
	extraButtons: ExtraButton[] = [],
) {
	return useToolbarContent(state, initialState, loading, form, 'add', manager, extraButtons)
}

export function useToolbarContentEdit(
	state: Ref<{ enabled: boolean }>,
	initialState: Ref | object,
	loading: Ref<boolean>,
	form: ShallowRef<Form<any> | null>,
	manager?: ToolbarManager,
	extraButtons: ExtraButton[] = [],
) {
	return useToolbarContent(state, initialState, loading, form, 'edit', manager, extraButtons)
}

export function useToolbarContentTitle(title: Ref<string>, manager?: ToolbarManager): void {
	if (!manager) {
		return
	}

	manager.setToolbarFn(() => [
		h('h2', { class: 'flex gap-2 items-center' }, [
			h(Icon, { icon: getIcon(manager.moduleName, true).checkedIcon, class: 'size-5' }),
			h('div', {}, title.value),
		]),
	])
}
