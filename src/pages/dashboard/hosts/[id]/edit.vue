<script lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { useHostById } from '@/loaders/hosts'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useHostSchema, type HostSchema } from '@/composables/schemas/hosts'
import { useQuery } from '@/composables/useQuery'
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

const route = useRoute('dashboard-hosts-id-edit')
const router = useRouter()
const { toolbar } = useToolbarForHostsModule()
const { data: host, isLoading, reload } = useHostById()
const { hostSchema } = useHostSchema(Number.parseInt(route.params.id))

const state = ref<any>({})
const form = useTemplateRef<Form<HostSchema>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, host, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostSchema>) {
	isLoading.value = true
	const { hosts } = useQuery()

	await hosts
		.update(Number.parseInt(route.params.id), event.data as any)
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
			state.value = newHost
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
