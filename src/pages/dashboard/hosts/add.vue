<script lang="ts">
import type { HostValidationInsertType } from '@/composables/validation/useHostValidation'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useQuery } from '@/composables/useQuery'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { useRouter } from 'vue-router'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-hosts-add',
})

const router = useRouter()
const { toolbar } = useToolbarForHostsModule()
const { hosts: hostSchema } = useSchemaValidation()
const { hosts: hostQuery } = useQuery()

const initialState: HostValidationInsertType = {
	name: '',
	description: { type: 'doc', content: [{ type: 'paragraph' }] },
	host: '',
	port: 22,
	auth_type: 'password',
	username: '',
	password: '',
	key_id: null,
	enabled: false,
	updated_at: '',
	created_at: '',
	deleted_at: null,
}

const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<HostValidationInsertType>>('form')
const isLoading = ref(false)

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostValidationInsertType>) {
	isLoading.value = true

	await hostQuery
		.create(event.data as any)
		.then(async result => {
			if (result !== undefined) {
				await router.push({ name: 'dashboard-hosts' })
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
		:schema="hostSchema.insert"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
