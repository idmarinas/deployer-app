<script lang="ts">
import type { PositionedButton } from '@/composables/usePositionedButtons'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { h, onBeforeUnmount, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'

import { useToast } from '@nuxt/ui/composables/useToast'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForPasskeysModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { usePasskeySchema, type PasskeySchema } from '@/composables/schemas/passkeys'
import { useGeneratePasskeyDialog } from '@/composables/useDialog'
import { useQuery } from '@/composables/useQuery'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-passkeys-add',
})

const UButton = resolveComponent('UButton')

const { t } = useI18n()
const router = useRouter()
const { toolbar } = useToolbarForPasskeysModule()
const cacheQuery = useQueryCache()

const toast = useToast()
const { passkeySchema } = usePasskeySchema()

const initialState: PasskeySchema = {
	name: '',
	description: undefined,
	key_type: 'ed25519',
	key_content: '',
	passphrase: '',
	fingerprint: undefined,
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

async function onSubmit(event: FormSubmitEvent<PasskeySchema>) {
	isLoading.value = true
	const { passkeys } = useQuery()
	const passkey = event.data

	const result = await passkeys.create(passkey as any)

	if (result) {
		await cacheQuery.invalidateQueries({ key: ['passkeys'] }, 'all')

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.passkeys.added', { name: passkey.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-passkeys' })
	} else {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t('notifications.passkeys.error', { name: passkey.name }),
			color: 'error',
		})
		isLoading.value = false
	}
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
		:schema="passkeySchema"
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
