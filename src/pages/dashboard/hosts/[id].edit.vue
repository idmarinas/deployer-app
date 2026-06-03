<script lang="ts">
import { useHostById } from '@/loaders/hosts'
import { watch, ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useHostSchema, type HostSchema } from '@/composables/schemas/hosts'
import { sanitizeNulls } from '@/utils/sanitize'
import { useToolbarContentEdit } from '@/composables/useToolbarContent'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'
import { CommandResponse, UpdateHostInput } from '@/types/tauri-types'
import { FormSubmitEvent } from '@nuxt/ui'
import { invoke } from '@tauri-apps/api/core'
</script>

<script setup lang="ts">
definePage({
  path: '/dashboard/hosts/:id(\\d+)/edit',
  name: 'dashboard-hosts-id-edit',
  params: {
    path: {
      id: 'int'
    }
  }
})

const { t } = useI18n()
const route = useRoute('dashboard-hosts-id-edit')
const router = useRouter()
const toolbar = useDashboardToolbar('hosts')
const toast = useToast()
const { data: host, isLoading, error, reload } = useHostById()
const { hostSchema, authPasswordSchema, authKeySchema } = useHostSchema(Number.parseInt(route.params.id))

const state = ref<any>({})
const form = useTemplateRef('form')
const showPassword = ref(false)

const updateToolbar = () => toolbar?.setToolbarContent(generateToolbarContent())
// Generar contenido del toolbar
const generateToolbarContent = useToolbarContentEdit('hosts', state, isLoading, updateToolbar, () => form.value?.submit(), () => {
  if (host.value) {
    state.value = sanitizeNulls(host.value)
  }
  form.value?.clear()
})

async function onSubmit(event: FormSubmitEvent<HostSchema>){
  isLoading.value = true
  const host: Partial<UpdateHostInput> = event.data

  const result = await invoke<CommandResponse<number>>('crud_update_host', {id: Number.parseInt(route.params.id), input: host})

  if (result.success) {
    toast.add({title: t('overlays.toast.title.success'), description: t('schemas.hosts.updated', { name: host.name }), color: 'success'})
    isLoading.value = false
    router.push({ name: 'dashboard-hosts' })
  } else {
    toast.add({title: t('overlays.toast.title.error'), description: result.message_key, color: 'error'})
    isLoading.value = false
  }
}

// Inyectar contenido en el toolbar cuando se monta el componente
onMounted(() => {
  reload()
  updateToolbar()
})

// Limpiar el toolbar cuando se desmonta
onBeforeUnmount(() => {
  toolbar?.clearToolbarContent()
})

watch(host, (newHost) => {
  if (newHost) {
    state.value = sanitizeNulls(newHost)
  }
}, { immediate: true })

watch(error, (err) => {
  if (err?.message === 'not-found') {
    router.push('/dashboard/hosts/:path(.*)')
  }
}, { immediate: true })

watch(isLoading, () => {
  updateToolbar()
})
</script>

<template>
  <USkeleton v-if="isLoading" class="size-9 rounded-full" />
  <UForm v-else ref="form" :disabled="isLoading" id="form-host-edit" :schema="hostSchema" :state="state" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit="onSubmit">
    <UFormField name="name" :label="t('schemas.hosts.form.name.label')" :help="t('schemas.hosts.form.name.help')" required>
      <UInput v-model="state.name" autocomplete="off" class="w-full" :ui="{ trailing: 'pointer-events-none' }" maxlength="120">
        <template #trailing>
          <div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
            {{ state.name?.length ?? 0 }}/120
          </div>
        </template>
      </UInput>
    </UFormField>

    <UFormField
      name="description"
      :label="t('schemas.hosts.form.description.label')"
      :help="t('schemas.hosts.form.description.help')"
      :hint="t('schemas.form.hint.optional')"
    >
      <UTextarea v-model="state.description" class="w-full" :ui="{ trailing: 'pointer-events-none' }" maxlength="1000">
        <template #trailing>
          <div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
            {{ state.description?.length ?? 0 }}/1000
          </div>
        </template>
      </UTextarea>
    </UFormField>

    <UFormField name="host" :label="t('schemas.hosts.form.host.label')" :help="t('schemas.hosts.form.host.help')" required>
      <UInput v-model="state.host" autocomplete="on" class="w-full" />
    </UFormField>

    <UFormField name="port" :label="t('schemas.hosts.form.port.label')" :help="t('schemas.hosts.form.port.help')" required>
      <UInputNumber v-model="state.port" autocomplete="on" class="w-full" :min="0" :max="65535" />
    </UFormField>

    <div class="flex flex-col gap-3">
      <UFormField name="auth_type" :label="t('schemas.hosts.form.auth_type.label')" :help="t('schemas.hosts.form.auth_type.help')" required>
        <USelect
          v-model="state.auth_type"
          value-key="id"
          :items="[
            {label: t('schemas.hosts.form.auth_type.select.password'), id: 'password'},
            {label: t('schemas.hosts.form.auth_type.select.key'), id: 'key'}
          ]"
          autocomplete="on"
          class="w-full"
        />
      </UFormField>

      <UForm v-if="state.auth_type === 'password'" :disabled="isLoading" :schema="authPasswordSchema" class="space-y-4" nested>
        <UFormField
          name="username"
          :label="t('schemas.hosts.form.username.label')"
          :help="t('schemas.hosts.form.username.help')"
          :required="state.auth_type === 'password'"
        >
          <UInput v-model="state.username" autocomplete="on" class="w-full" />
        </UFormField>
        <UFormField
          name="password"
          :label="t('schemas.hosts.form.password.label')"
          :help="t('schemas.hosts.form.password.help')"
          :required="state.auth_type === 'password'"
        >
          <UInput :type="showPassword ? 'text' : 'password'"  v-model="state.password" autocomplete="off" class="w-full" :ui="{ trailing: 'pe-1' }">
            <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-tabler-eye-off' : 'i-tabler-eye'"
              :aria-label="showPassword ? t('schemas.form.hide.password') : t('schemas.form.show.password')"
              :aria-pressed="showPassword"
              aria-controls="password"
              @click="showPassword = !showPassword"
            />
          </template>
          </UInput>
        </UFormField>
      </UForm>
      <UForm v-else-if="state.auth_type === 'key'" :disabled="isLoading" :schema="authKeySchema" class="space-y-4" nested>
        <UFormField name="key_id" :label="t('schemas.hosts.form.key.label')" :help="t('schemas.hosts.form.key.help')" :required="state.auth_type === 'key'">
          <SelectKeypass v-model="state.key_id" class="w-full" />
        </UFormField>
      </UForm>
    </div>
  </UForm>
</template>
