<script lang="ts">
import { useHostById } from '@/loaders/hosts'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useHostSchema, type HostSchema } from '@/composables/schemas/hosts'
import { useQuery } from '@/composables/useQuery'
import { sanitizeNulls } from '@/utils/sanitize'
import { Form, FormSubmitEvent } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'
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
const { toolbar } = useToolbarForHostsModule()
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
	const { hosts } = useQuery()
	const host = event.data as any

	const result = await hosts.update(Number.parseInt(route.params.id), host)

	if (result) {
		await queryCache.invalidateQueries({ key: ['hosts'] }, 'all')

		toast.add({
			title: t('overlays.toast.title.success'),
			description: t('schemas.hosts.updated', { name: host.name }),
			color: 'success',
		})
		isLoading.value = false
		router.push({ name: 'dashboard-hosts' })
	} else {
		toast.add({ title: t('overlays.toast.title.error'), description: t('errors.hosts.update_failed'), color: 'error' })
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
	<UForm
		ref="form"
		id="form-host-edit"
		:disabled="isLoading"
		:schema="hostSchema"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
