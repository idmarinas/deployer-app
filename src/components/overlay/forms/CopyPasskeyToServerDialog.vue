<script lang="ts">
import type { Passkey } from '@/types/entities'
import type { CommandResponse, ExportPublicKeyInput } from '@/types/tauri-types'
import type { FormSubmitEvent } from '@nuxt/ui'

import { ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { invoke } from '@tauri-apps/api/core'

import { useSchemaValidation } from '@/composables/useSchemaValidation'
</script>

<script setup lang="ts">
const emits = defineEmits<{
	close: [value: boolean]
}>()
const props = defineProps<{
	passkey: Passkey
}>()

const { passkeys: passkeySchema } = useSchemaValidation()
const { t } = useI18n()
const toast = useToast()

const isLoading = ref(false)

const state = ref<Partial<ExportPublicKeyInput>>({
	passkey_id: props.passkey.id,
	host_id: undefined,
	action: undefined,
	temp_password: undefined,
	temp_username: undefined,
})

const form = useTemplateRef('form-copy-passkey')
const onlyEnabled = ref(false)

async function onSubmit(event: FormSubmitEvent<Partial<ExportPublicKeyInput>>) {
	isLoading.value = true
	const input = event.data

	const response = await invoke<CommandResponse>('export_public_key', { input })
	let result = true

	if (response.success) {
		toast.add({
			title: t('overlays.toast.title.success'),
			description: t(response.message_key, response.message_params),
			color: 'success',
		})
	} else {
		result = false
		toast.add({
			title: t('overlays.toast.title.error'),
			description: t(response.message_key, response.message_params),
			color: 'error',
		})
	}

	emits('close', result)
	isLoading.value = false
}
</script>

<template>
	<UModal
		:title="t('form.passkeys.copy_to_host.title')"
		:description="t('form.passkeys.copy_to_host.description', { name: props.passkey.name })"
		:close="false"
		:dismissible="false"
		:ui="{ content: 'max-w-2xl' }"
	>
		<template #body>
			<UForm
				ref="form-copy-passkey"
				:state="state as any"
				:schema="passkeySchema.passkeyToServerSchema"
				:disabled="isLoading"
				@submit="onSubmit"
			>
				<div class="flex items-center gap-2">
					<UFormField
						name="host_id"
						:label="t('form.passkeys.server.label')"
						:help="t('form.passkeys.server.help')"
						class="flex-1"
						required
					>
						<SelectHost v-model="state.host_id" class="w-full" :only-enabled="onlyEnabled" />
					</UFormField>
					<USwitch
						name="only_enabled"
						v-model="onlyEnabled"
						checked-icon="i-tabler-check"
						unchecked-icon="i-tabler-x"
						class="w-1/3"
						:label="t('form.passkeys.server.only_enabled.label')"
					/>
				</div>
			</UForm>
		</template>
		<template #footer>
			<UButton
				:label="t(`overlays.dialog.passkey_to_server.remove`)"
				:loading="isLoading"
				icon="i-tabler-trash"
				color="error"
				variant="outline"
				@click="
					() => {
						state.action = 'remove'
						form?.submit()
					}
				"
			/>
			<div class="flex-1"></div>
			<UButton
				:label="t(`overlays.dialog.passkey_to_server.copy`)"
				:loading="isLoading"
				icon="i-tabler-plus"
				color="primary"
				variant="outline"
				@click="
					() => {
						state.action = 'add'
						form?.submit()
					}
				"
			/>
			<UButton
				:label="t(`overlays.dialog.passkey_to_server.cancel`)"
				:loading="isLoading"
				icon="i-tabler-x"
				color="neutral"
				variant="outline"
				@click="emits('close', false)"
			/>
		</template>
	</UModal>
</template>
