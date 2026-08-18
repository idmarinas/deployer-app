<script lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { useQueryCache } from '@pinia/colada'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useDashboardToolbar } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { usePasskeySchema, type PasskeySchema } from '@/composables/schemas/passkeys'
import { usePasskeyById } from '@/loaders/passkeys'
import { useQuery } from '@/composables/useQuery'
import { sanitizeNulls } from '@/utils/sanitize'
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
	const { passkeys } = useQuery()
	const passkey = event.data as any

	const result = await passkeys.update(Number.parseInt(route.params.id), passkey)

	if (result) {
		await queryCache.invalidateQueries({ key: ['passkeys'] }, 'all')

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.passkeys.updated', { name: passkey.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-passkeys' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: t('errors.passkeys.update_failed'), color: 'error' })
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
