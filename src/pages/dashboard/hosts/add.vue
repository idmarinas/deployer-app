<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CommandResponse, CreateHostInput } from '@/types/tauri-types'

import { ref, useTemplateRef, onMounted, onBeforeUnmount, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { useHostSchema, type HostSchema, type AuthKeySchema, type AuthPasswordSchema } from '@/composables/schemas/hosts'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useRouter } from 'vue-router'

import { invoke } from '@tauri-apps/api/core'

definePage({
  name: 'dashboard-hosts-add'
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
  enabled: false
}
const state = ref<any>({...initialState})
const form = useTemplateRef('form')
const isLoading = ref(false)

const handleReset = () => {
  Object.assign(state, initialState)
  form.value?.clear()
}

const updateToolbar = () => toolbar?.setToolbarContent(generateToolbarContent())
// Generar contenido del toolbar
const generateToolbarContent = useToolbarContentCreate('hosts', state, isLoading, updateToolbar, () => form.value?.submit(), handleReset)

async function onSubmit(event: FormSubmitEvent<HostSchema>){
  isLoading.value = true
  const host: Partial<CreateHostInput> = event.data

  const result = await invoke<CommandResponse<number>>('crud_create_host', {input: host})

  if (result.success) {
    toast.add({title: t('overlays.toast.title.success'), description: t('schemas.hosts.added', { name: host.name }), color: 'success'})
    isLoading.value = false
    router.push({ name: 'dashboard-hosts' })
  } else {
    toast.add({title: t('overlays.toast.title.error'), description: result.message_key, color: 'error'})
    isLoading.value = false
  }
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
  updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
  toolbar?.clearToolbarContent()
})

// Actualizar toolbar cuando isLoading cambia
watch(isLoading, updateToolbar)
</script>

<template>
  <UForm ref="form" :disabled="isLoading" id="form-host-create" :schema="hostSchema" :state="state" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit="onSubmit">
    <HostForm v-model="state" :is-loading="isLoading" />
  </UForm>
</template>