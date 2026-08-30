<script lang="ts">
import type { HostValidationUpdateType } from '@/composables/validation/useHostValidation'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToolbarContentEdit } from '@/composables/dashboard/toolbar/useToolbarContent'
import { useToolbarForHostsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { useQuery } from '@/composables/useQuery'
import { useHostValidation } from '@/composables/validation/useHostValidation'
import { useHostById } from '@/loaders/hosts'
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
const hostSchema = useHostValidation(Number.parseInt(route.params.id))
const { toolbar } = useToolbarForHostsModule()
const { data: host, isLoading, reload } = useHostById()
const { hosts: hostsQuery } = useQuery()

const state = ref<any>({})
const form = useTemplateRef<Form<HostValidationUpdateType>>('form')

// Generar contenido del toolbar
useToolbarContentEdit(state, host, isLoading, form, toolbar)

async function onSubmit(event: FormSubmitEvent<HostValidationUpdateType>) {
	isLoading.value = true

	await hostsQuery
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
		:schema="hostSchema.update"
		:state="state"
		class="grid grid-cols-1 md:grid-cols-2 gap-4"
		@submit="onSubmit"
	>
		<HostForm v-model="state" :is-loading="isLoading" />
	</UForm>
</template>
