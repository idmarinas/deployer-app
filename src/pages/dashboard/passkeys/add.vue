<script lang="ts">
import type { PasskeySchema } from '@/composables/schemas/passkeys'
import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { Passkey } from '@/types/entities'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { h, onBeforeUnmount, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForPasskeysModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useGeneratePasskeyDialog } from '@/composables/useDialog'
import { useQuery } from '@/composables/useQuery'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { PasskeyValidationInsertType } from '@/composables/validation/usePasskeyValidation'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-passkeys-add',
})

const UButton = resolveComponent('UButton')

const router = useRouter()
const { t } = useI18n()
const { toolbar } = useToolbarForPasskeysModule()
const { passkeys: passkeySchema } = useSchemaValidation()
const { passkeys: passkeyQuery } = useQuery()

const initialState: PasskeyValidationInsertType = {
	name: '',
	description: {},
	enabled: false,
	key_type: 'ed25519',
	key_content: '',
	passphrase: null,
	fingerprint: null,
	updated_at: '',
	created_at: '',
	deleted_at: null,
}
const state = ref<any>({ ...initialState })
const checkPasswordStrength = ref(true)
const disabledPassword = ref(false)
const form = useTemplateRef<Form<PasskeySchema>>('form')
const isLoading = ref(false)

const toolbarButtons: PositionedButton[] = [
	{
		id: 'generate-passkey',
		action: 'after',
		targetId: 'submit',
		vnode: () =>
			h(UButton, {
				label: t('form.generate.passkey'),
				variant: 'outline',
				color: 'info',
				icon: 'i-tabler-password-fingerprint',
				loading: isLoading.value,
				onClick: async () => {
					isLoading.value = true
					const formDialog = useGeneratePasskeyDialog()
					const result = await formDialog()

					if (result === false || result === null) {
						isLoading.value = false

						return
					}

					state.value.key_content = result.key_content
					state.value.fingerprint = result.fingerprint
					state.value.passphrase = result.passphrase || ''
					state.value.key_type = result.key_type

					checkPasswordStrength.value = false
					disabledPassword.value = true

					isLoading.value = false
				},
			}),
	},
]
// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar, toolbarButtons)

async function onSubmit(event: FormSubmitEvent<PasskeyValidationInsertType>) {
	isLoading.value = true

	await passkeyQuery
		.create(event.data)
		.then(async (data?: Passkey) => {
			if (data !== undefined && data.id) {
				await router.push({ name: 'dashboard-passkeys' })
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
		id="form-host-create"
		:schema="passkeySchema.insert"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<PasskeyForm
			v-model="state"
			:check-password-strength="checkPasswordStrength"
			:disabled-password="disabledPassword"
		/>
	</UForm>
</template>
