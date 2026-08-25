<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { useToolbarContentCreate } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import {
	useHostSchema,
	type AuthKeySchema,
	type AuthPasswordSchema,
	type HostSchema,
} from '@/composables/schemas/hosts'
import { useQuery } from '@/composables/useQuery'
import { useRouter } from 'vue-router'

definePage({
	name: 'dashboard-hosts-add',
})

const { toolbar } = useToolbarForHostsModule()
const router = useRouter()

const { hostSchema } = useHostSchema()

type HostFullSchema = HostSchema & (AuthPasswordSchema | AuthKeySchema)

const initialState: HostFullSchema = {
	name: '',
	description: undefined,
	host: '',
	port: 22,
	auth_type: 'password',
	username: '',
	password: '',
	key_id: null,
	enabled: false,
}
const state = ref<any>({ ...initialState })
const form = useTemplateRef<Form<HostSchema>>('form')
const isLoading = ref(false)

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostSchema>) {
	isLoading.value = true
	const { hosts } = useQuery()
	const host = event.data

	await hosts
		.create(host as any)
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
		:schema="hostSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
