<script setup lang="ts">
import type { CommandResponse, CreateHostInput } from '@/types/tauri-types'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import {
	useHostSchema,
	type AuthKeySchema,
	type AuthPasswordSchema,
	type HostSchema,
} from '@/composables/schemas/hosts'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useQueryCache } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'

definePage({
	name: 'dashboard-hosts-add',
})

const { t } = useI18n()
const router = useRouter()
const toolbar = useDashboardToolbar('hosts')

const toast = useToast()
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
const queryCache = useQueryCache()

// Generar contenido del toolbar
useToolbarContentCreate(state, initialState, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostSchema>) {
	isLoading.value = true
	const host: Partial<CreateHostInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_create_host', { input: host })

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['hosts'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('notifications.hosts.added', { name: host.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-hosts' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: result.message_key, color: 'error' })
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
		:schema="hostSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
