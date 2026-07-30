<script lang="ts">
import { useHostById } from '@/loaders/hosts'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useDashboardToolbar } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useHostSchema, type HostSchema } from '@/composables/schemas/hosts'
import { CommandResponse, UpdateHostInput } from '@/types/tauri-types'
import { sanitizeNulls } from '@/utils/sanitize'
import { Form, FormSubmitEvent } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
	path: '/dashboard/hosts/:id(\\d+)/edit',
	name: 'dashboard-hosts-id-edit',
	params: {
		path: {
			id: 'int',
		},
	},
})

const { t } = useI18n()
const route = useRoute('dashboard-hosts-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('hosts')
const toast = useToast()
const { data: host, isLoading, reload } = useHostById()
const { hostSchema } = useHostSchema(Number.parseInt(route.params.id))

const queryCache = useQueryCache()

const state = ref<any>({})
const form = useTemplateRef<Form<HostSchema>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, host, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostSchema>) {
	isLoading.value = true
	const host: Partial<UpdateHostInput> = event.data

	const result = await invoke<CommandResponse<number>>('crud_update_host', {
		id: Number.parseInt(route.params.id),
		input: host,
	})

	if (result.success) {
		await queryCache.invalidateQueries({ key: ['hosts'] })

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.hosts.updated', { name: host.name }),
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
	reload()
	toolbar?.updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
	toolbar?.clearContent()
})

watch(
	host,
	newHost => {
		if (newHost) {
			state.value = sanitizeNulls(newHost)
		}
	},
	{ immediate: true },
)

watch(isLoading, () => {
	toolbar?.updateToolbar()
})
</script>

<template>
	<USkeleton v-if="isLoading" class="size-9 rounded-full" />
	<UForm
		v-else
		ref="form"
		:disabled="isLoading"
		id="form-host-edit"
		:schema="hostSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
