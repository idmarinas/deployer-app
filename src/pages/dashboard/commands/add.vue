<script lang="ts">
import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { CommandValidationInsertType } from '@/composables/validation/useCommandValidation'
import type { Command } from '@/types/entities'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { h, onBeforeUnmount, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForCommandsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useCommandQuery } from '@/composables/queries/commands'
import { useCommandTestDialog } from '@/composables/useDialog'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-commands-add',
})

const UButton = resolveComponent('UButton')

const router = useRouter()
const { t } = useI18n()
const { toolbar } = useToolbarForCommandsModule()
const { commands: commandSchema } = useSchemaValidation()
const commandQuery = useCommandQuery()

const initialState: CommandValidationInsertType = {
	key: '',
	name: '',
	description: { type: 'doc', content: [{ type: 'paragraph' }] },
	command: '',
	parser: { type: 'raw' },
	timeout: 30,
	enabled: false,
	updated_at: '',
	created_at: '',
	deleted_at: null,
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<CommandValidationInsertType>>('form')
const isLoading = ref(false)

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
				disabled: !state.value.command,
				onClick: async () => {
					const dialog = useCommandTestDialog()
					await dialog({
						title: state.value.name || t('form.commands.title.add'),
						command: state.value.command,
						parser: state.value.parser,
						timeout: state.value.timeout,
					})
				},
			}),
	},
]

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar, toolbarButtons)

async function onSubmit(event: FormSubmitEvent<CommandValidationInsertType>) {
	isLoading.value = true

	const data = event.data
	data.custom = true

	await commandQuery
		.create(data as any)
		.then(async (data?: Command) => {
			if (data !== undefined && data.key) {
				await router.push({ name: 'dashboard-commands' })
			}
		})
		.finally(() => {
			isLoading.value = false
		})
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

// Actualizar toolbar cuando isLoading cambia
watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<UForm
		ref="form"
		:disabled="isLoading"
		id="form-command-create"
		:schema="commandSchema.insert"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<CommandForm v-model="state" />
	</UForm>
</template>
