<script lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CommandResponse, CreatePasskeyInput } from '@/types/tauri-types'
import type { ExtraButton } from '@/composables/useToolbarContent'

import { ref, useTemplateRef, onMounted, onBeforeUnmount, watch, h, resolveComponent } from 'vue'

import { useToast } from '@nuxt/ui/composables/useToast'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { usePasskeySchema, type PasskeySchema } from '@/composables/schemas/passkeys'
import { useToolbarContentCreate } from '@/composables/useToolbarContent'
import { useGeneratePasskeyDialog } from '@/composables/useDialog'

import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
  name: 'dashboard-passkeys-add'
})

const UButton = resolveComponent('UButton')

const { t } = useI18n()
const router = useRouter()
const toolbar = useDashboardToolbar('passkeys')

const toast = useToast()
const { passkeySchema } = usePasskeySchema()

const initialState: PasskeySchema = {
  name: '',
  description: undefined,
  key_type: 'ed25519',
  key_content: '',
  passphrase: '',
  fingerprint: undefined
}
const state = ref<any>({...initialState})
const checkPasswordStrength = ref(true)
const disabledPassword = ref(false)
const form = useTemplateRef('form')
const isLoading = ref(false)

const handleReset = () => {
  Object.assign(state, initialState)
  form.value?.clear()
}

const updateToolbar = () => toolbar?.setToolbarContent(generateToolbarContent())
const toolbarButtons: ExtraButton[] = [
  {
    id: 'generate-passkey',
    position: 'after-submit',
    vnode: () => h(UButton, {
      label: t('components.form.generate.passkey'),
      variant: 'outline',
      color: 'info',
      icon: 'i-tabler-password-fingerprint',
      loading: isLoading.value,
      onClick: async () => {
        isLoading.value = true
        const formDialog = useGeneratePasskeyDialog()
        const result = await formDialog()

        if (result === false || result === null) {
          isLoading.value = false

          return
        }

        state.value.key_content = result.key_content
        state.value.fingerprint = result.fingerprint
        state.value.passphrase = result.passphrase || ''
        state.value.key_type = result.key_type

        checkPasswordStrength.value = false
        disabledPassword.value = true

        isLoading.value = false
      }
    })
  }
]
// Generar contenido del toolbar
const generateToolbarContent = useToolbarContentCreate('passkeys', state, isLoading, updateToolbar, () => form.value?.submit(), handleReset, toolbarButtons)

async function onSubmit(event: FormSubmitEvent<PasskeySchema>){
  isLoading.value = true
  const passkey: Partial<CreatePasskeyInput> = event.data

  const result = await invoke<CommandResponse<number>>('crud_create_passkey', {input: passkey})

  if (result.success) {
    toast.add({title: t('overlays.toast.title.success'), description: t('schemas.passkeys.added', { name: passkey.name }), color: 'success'})
    isLoading.value = false
    router.push({ name: 'dashboard-passkeys' })
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
  <UForm ref="form" :disabled="isLoading" id="form-host-create" :schema="passkeySchema" :state="state" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit="onSubmit">
    <PasskeyForm v-model="state" :check-password-strength="checkPasswordStrength" :disabled-password="disabledPassword" />
  </UForm>
</template>