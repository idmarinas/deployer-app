<script lang="ts">
import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { CommandValidationUpdateType } from '@/composables/validation/useCommandValidation'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { h, onBeforeUnmount, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from 'vue-i18n'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForCommandsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useCommandQuery } from '@/composables/queries/commands'
import { useCommandTestDialog } from '@/composables/useDialog'
import { useCommandValidation } from '@/composables/validation/useCommandValidation'
import { useCommandByKey } from '@/loaders/commands'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/commands/:key/edit',
	name: 'dashboard-commands-key-edit',
})

const route = useRoute('dashboard-commands-key-edit')
const UButton = resolveComponent('UButton')
const router = useRouter()
const { t } = useI18n()
const { toolbar } = useToolbarForCommandsModule()
const { data: command, isLoading, reload } = useCommandByKey()
const commandSchema = useCommandValidation(String(route.params.key))
const commandQuery = useCommandQuery()

const state = ref<any>({})
const form = useTemplateRef<Form<CommandValidationUpdateType>>('form')

const toolbarButtons: PositionedButton[] = [
	{
		id: 'test-command',
		action: 'after',
		targetId: 'submit',
		vnode: () =>
			h(UButton, {
				label: t('common.actions.test'),
				variant: 'outline',
				color: 'success',
				icon: ICONS.actions.play,
				loading: isLoading.value,
				disabled: !state.value.key,
				onClick: async () => {
					const dialog = useCommandTestDialog()
					await dialog({
						title: state.value.name,
						command: state.value.command,
						parser: state.value.parser,
						timeout: state.value.timeout,
						commandKey: state.value.key,
					})
				},
			}),
	},
]

// Generar contenido del toolbar
useToolbarContentEdit(state, {}, isLoading, form, toolbar, toolbarButtons)

async function onSubmit(event: FormSubmitEvent<CommandValidationUpdateType>) {
	isLoading.value = true

	const data = event.data
	data.custom = true

	await commandQuery
		.update(String(route.params.key), data as any)
		.then(async result => {
			if (result !== undefined) {
				await router.push({ name: 'dashboard-commands' })
			}
		})
		.finally(() => {
			isLoading.value = false
		})
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(async () => {
	await reload()
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(
	command,
	newCommand => {
		if (newCommand) {
			state.value = newCommand
		}
	},
	{ immediate: true },
)

watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		id="form-command-edit"
		:schema="commandSchema.update"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<CommandForm v-model="state" is-edit />
	</UForm>
</template>
