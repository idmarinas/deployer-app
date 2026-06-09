<script lang="ts">
import { useI18n } from 'vue-i18n'
import { useHostSchema } from '@/composables/schemas/hosts'
</script>

<script setup lang="ts">
const state = defineModel<{
  name: string,
  description?: string,
  host: string,
  port: number,
  auth_type: 'password' | 'key',
  username: string,
  password: string,
  key_id: number | null,
  enabled: boolean
}>({required: true})

const props = defineProps<{
  isLoading: boolean
}>()

const { t } = useI18n()

const { authPasswordSchema, authKeySchema } = useHostSchema()
</script>

<template>
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

    <UFormField
      name="username"
      :label="t('schemas.hosts.form.username.label')"
      :help="t('schemas.hosts.form.username.help')"
      required
    >
      <UInput v-model="state.username" autocomplete="on" class="w-full" />
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
          @update:model-value="(value) => {
            if (value === 'password') {
              state.password = ''
              state.key_id = null
            } else if (value === 'key') {
              state.password = ''
              state.key_id = null
            }
          }"
        />
      </UFormField>

      <UForm v-if="state.auth_type === 'password'" :disabled="isLoading" :schema="authPasswordSchema" class="space-y-4" nested>
        <PasswordStrength
          name="password"
          v-model="state.password"
          :label="t('schemas.hosts.form.password.label')"
          :help="t('schemas.hosts.form.password.help')"
          :required="state.auth_type === 'password'"
          :optional="state.auth_type !== 'password'"
        />
      </UForm>
      <UForm v-else-if="state.auth_type === 'key'" :disabled="isLoading" :schema="authKeySchema" class="space-y-4" nested>
        <UFormField name="key_id" :label="t('schemas.hosts.form.key.label')" :help="t('schemas.hosts.form.key.help')" :required="state.auth_type === 'key'">
          <SelectKeypass v-model="state.key_id" class="w-full" />
        </UFormField>
      </UForm>
    </div>
</template>