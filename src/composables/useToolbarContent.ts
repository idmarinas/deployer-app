import type { Form } from '@nuxt/ui'
import type { Ref, ShallowRef, VNode } from 'vue'

import { h, isRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { Icon } from '@iconify/vue'
import UButton from '@nuxt/ui/components/Button.vue'
import USwitch from '@nuxt/ui/components/Switch.vue'

import { ICONS, getModuleIcon, getModuleSwitchIcons } from '@/utils/icons'
import { useRouter } from 'vue-router'
import { ToolbarManager } from './useDashboardToolbar'

import { usePositionedButtons, type PositionedButton } from './usePositionedButtons'

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
	extraButtons: PositionedButton[] = [],
) {
	const { t } = useI18n()
	const router = useRouter()
	const { resolveButtons } = usePositionedButtons()

	const defaultButtons: PositionedButton[] = [
		{
			id: 'submit',
			vnode: () =>
				h(UButton, {
					label: type === 'edit' ? t('form.save') : t('form.submit'),
					icon: type === 'edit' ? ICONS.actions.save : ICONS.actions.submit,
					loading: loading.value,
					class: 'first:mr-10',
					onClick: () => form.value?.submit(),
				}),
		},
		{
			id: 'reset',
			vnode: () =>
				h(UButton, {
					label: t('form.reset'),
					icon: ICONS.actions.reset,
					variant: 'soft',
					loading: loading.value,
					onClick: () => {
						state.value = (isRef(initialState) ? initialState.value : initialState) as any
						form.value?.clear()
					},
				}),
		},
		{
			id: 'cancel',
			vnode: () =>
				h(UButton, {
					label: t('form.cancel'),
					icon: ICONS.actions.cancel,
					variant: 'outline',
					color: 'neutral',
					loading: loading.value,
					onClick: () => router.back(),
				}),
		},
	]

	if (!manager) {
		return
	}

	manager.setToolbarFn(() => [
		h('h2', { class: 'flex gap-2 items-center' }, [
			h(USwitch, {
				modelValue: state.value.enabled,
				...getModuleSwitchIcons(manager.moduleName),
				loading: loading.value,
				size: 'xl',
				'onUpdate:modelValue': (value: unknown) => {
					state.value.enabled = value as boolean
					manager.updateToolbar()
				},
			}),
			h('span', { class: 'flex flex-col' }, [
				h('span', {}, t(`form.${manager.moduleName}.title.${type}`)),
				h(
					'span',
					{
						class: `text-sm ${state.value.enabled ? 'text-green-600' : 'text-red-600'}`,
					},
					state.value.enabled ? t('common.status.active') : t('common.status.inactive'),
				),
			]),
		]),
		h('div', { class: 'flex gap-2 items-center' }, resolveButtons(defaultButtons, extraButtons)),
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
	extraButtons: PositionedButton[] = [],
) {
	return useToolbarContent(state, initialState, loading, form, 'add', manager, extraButtons)
}

export function useToolbarContentEdit(
	state: Ref<{ enabled: boolean }>,
	initialState: Ref | object,
	loading: Ref<boolean>,
	form: ShallowRef<Form<any> | null>,
	manager?: ToolbarManager,
	extraButtons: PositionedButton[] = [],
) {
	return useToolbarContent(state, initialState, loading, form, 'edit', manager, extraButtons)
}

export function useToolbarContentTitle(title: Ref<string>, manager?: ToolbarManager, extra?: Ref<VNode[]>): void {
	if (!manager) {
		return
	}

	manager.setToolbarFn(() => [
		h('h2', { class: 'flex gap-2 items-center' }, [
			h(Icon, { icon: getModuleIcon(manager.moduleName, 'singular', true), class: 'size-5' }),
			h('span', {}, title.value),
		]),
		h('div', { class: 'flex gap-3 items-center' }, extra?.value),
	])
}
