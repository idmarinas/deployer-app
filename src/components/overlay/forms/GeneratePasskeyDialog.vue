<script lang="ts">
import type { CommandResponse, GeneratedPasskey, GeneratePasskeyInput } from '@/types/tauri-types'
import type { FormSubmitEvent } from '@nuxt/ui'

import { ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
const emits = defineEmits<{
	close: [value: false | GeneratedPasskey]
}>()

const { t } = useI18n()
const toast = useToast()

const state = ref({
	key_type: 'ed25519',
	passphrase: '',
})
const isLoading = ref(false)

const form = useTemplateRef('form-generate-passkey')

async function onSubmit(event: FormSubmitEvent<GeneratePasskeyInput>) {
	isLoading.value = true

	const input: GeneratePasskeyInput = event.data
	const response = await invoke<CommandResponse<GeneratedPasskey>>('generate_passkey', { input: input })
	let result: false | GeneratedPasskey = false

	if (response.success && response.data) {
		result = response.data
	} else {
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t(response.message_key, response.message_params),
			color: 'error',
		})
	}

	isLoading.value = false
	emits('close', result)
}
</script>

<template>
	<UModal
		:title="t('form.passkeys.generate.title')"
		:description="t('form.passkeys.generate.description')"
		:ui="{ footer: 'justify-end' }"
		:close="false"
		:dismissible="false"
		modal
	>
		<template #body>
			<UForm
				ref="form-generate-passkey"
				:state="state"
				:disabled="isLoading"
				class="flex flex-col gap-4"
				@submit="onSubmit"
			>
				<UFormField
					name="key_type"
					:label="t('form.passkeys.key_type.label')"
					:help="t('form.passkeys.key_type.help')"
					required
				>
					<USelect
						v-model="state.key_type"
						value-key="id"
						:items="[
							{
								label: t('form.passkeys.key_type.select.rsa.label'),
								description: t('form.passkeys.key_type.select.rsa.description'),
								id: 'rsa',
							},
							{
								label: t('form.passkeys.key_type.select.ed25519.label'),
								description: t('form.passkeys.key_type.select.ed25519.description'),
								id: 'ed25519',
							},
							{
								label: t('form.passkeys.key_type.select.ecdsa.label'),
								description: t('form.passkeys.key_type.select.ecdsa.description'),
								id: 'ecdsa',
							},
						]"
						:ui="{ itemDescription: 'whitespace-normal leading-snug' }"
						autocomplete="on"
						class="w-full"
					/>
				</UFormField>

				<PasswordInput
					name="passphrase"
					v-model="state.passphrase"
					:label="t('form.passkeys.passphrase.label')"
					:help="t('form.passkeys.passphrase.help')"
					optional
				/>
			</UForm>
		</template>
		<template #footer>
			<UButton
				:label="t(`overlays.dialog.generate_passkey.confirm`)"
				:loading="isLoading"
				icon="i-tabler-password-fingerprint"
				color="primary"
				variant="outline"
				@click="() => form?.submit()"
			/>
			<UButton
				:label="t(`overlays.dialog.generate_passkey.cancel`)"
				:loading="isLoading"
				icon="i-tabler-x"
				color="neutral"
				variant="outline"
				@click="emits('close', false)"
			/>
		</template>
	</UModal>
</template>
