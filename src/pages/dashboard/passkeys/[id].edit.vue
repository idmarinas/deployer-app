<script lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { watch, ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'

import { usePasskeySchema, type PasskeySchema } from '@/composables/schemas/passkeys'
import { sanitizeNulls } from '@/utils/sanitize'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { CommandResponse, UpdatePasskeyInput } from '@/types/tauri-types'
import { usePasskeyById } from '@/loaders/passkeys'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/passkeys/:id(\\d+)/edit',
	name: 'dashboard-passkeys-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-passkeys-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('passkeys')
const toast = useToast()
const { data: passkey, isLoading, reload } = usePasskeyById()
const { passkeySchema } = usePasskeySchema(Number.parseInt(route.params.id))
const queryCache = useQueryCache()

const state = ref<any>({})
const form = useTemplateRef<Form<PasskeySchema>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, passkey, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<PasskeySchema>) {
	isLoading.value = true
	const passkey: Partial<UpdatePasskeyInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_passkey', {
		id: Number.parseInt(route.params.id),
		input: passkey,
	})

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['passkeys'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.passkeys.updated', { name: passkey.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-passkeys' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
		isLoading.value = false
	}
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
	reload()
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(
	passkey,
	newPasskey => {
		if (newPasskey) {
			state.value = sanitizeNulls(newPasskey)
		}
	},
	{ immediate: true },
)

watch(isLoading, () => toolbar?.updateToolbar())
</script>

<template>
	<USkeleton v-if="isLoading" class="size-9 rounded-full" />
	<UForm
		v-else
		ref="form"
		:disabled="isLoading"
		id="form-host-edit"
		:schema="passkeySchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<PasskeyForm v-model="state" :check-password-strength="false" :is-edit="true" />
	</UForm>
</template>
