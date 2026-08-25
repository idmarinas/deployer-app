<script lang="ts">
import type { PasskeyValidationUpdateType } from '@/composables/validation/usePasskeyValidation'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForPasskeysModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useQuery } from '@/composables/useQuery'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { usePasskeyById } from '@/loaders/passkeys'
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

const route = useRoute('dashboard-passkeys-id-edit')
const router = useRouter()
const { toolbar } = useToolbarForPasskeysModule()
const { data: passkey, isLoading, reload } = usePasskeyById()
const { passkeys: passkeySchema } = useSchemaValidation(Number.parseInt(route.params.id))
const { passkeys: passkeyQuery } = useQuery()

const state = ref<any>({})
const form = useTemplateRef<Form<PasskeyValidationUpdateType>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, passkey, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<PasskeyValidationUpdateType>) {
	isLoading.value = true

	await passkeyQuery
		.update(Number.parseInt(route.params.id), event.data)
		.then(async result => {
			if (result !== undefined) {
				await router.push({ name: 'dashboard-passkeys' })
			}
		})
		.finally(() => {
			isLoading.value = false
		})
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
			state.value = newPasskey
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
		id="form-host-edit"
		:schema="passkeySchema.update"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<PasskeyForm v-model="state" :check-password-strength="false" :is-edit="true" />
	</UForm>
</template>
