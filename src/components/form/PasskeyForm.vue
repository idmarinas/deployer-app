<script lang="ts">
import { useI18n } from 'vue-i18n'
import { usePasskeySchema } from '@/composables/schemas/passkeys'
</script>

<script setup lang="ts">
const state = defineModel<{
  name: string,
  description?: string,
  key_type: 'rsa' | 'ed25519' | 'ecdsa',
  key_content: string,
  passphrase: string,
  fingerprint: string
}>({required: true})

const props = withDefaults(defineProps<{
  checkPasswordStrength?: boolean,
  disabledPassword?: boolean,
  isEdit?: boolean
}>(), {
  checkPasswordStrength: true,
  disabledPassword: false,
  isEdit: false
})

const { passkeySchema: schema } = usePasskeySchema()
const { t } = useI18n()
</script>

<template>
<UFormField name="name" :label="t('form.passkeys.name.label')" :help="t('form.passkeys.name.help')" required>
  <UInput v-model="state.name" autocomplete="off" class="w-full" :ui="{ trailing: 'pointer-events-none' }" :maxlength="schema.shape.name.maxLength || undefined">
    <template #trailing>
      <div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
        {{ state.name?.length ?? 0 }}/{{ schema.shape.name.maxLength || 0}}
      </div>
    </template>
  </UInput>
</UFormField>

<UFormField
  name="description"
  :label="t('form.passkeys.description.label')"
  :help="t('form.passkeys.description.help')"
  :hint="t('form.shared.hint.optional')"
>
  <DescriptionEditor v-model="state.description" />
</UFormField>

<UFormField name="key_type" :label="t('form.passkeys.key_type.label')" :help="t('form.passkeys.key_type.help')" required>
  <USelect
    v-model="state.key_type"
    value-key="id"
    :items="[
      {label: t('form.passkeys.key_type.select.rsa.label'), description: t('form.passkeys.key_type.select.rsa.description'), id: 'rsa'},
      {label: t('form.passkeys.key_type.select.ed25519.label'), description: t('form.passkeys.key_type.select.ed25519.description'), id: 'ed25519'},
      {label: t('form.passkeys.key_type.select.ecdsa.label'), description: t('form.passkeys.key_type.select.ecdsa.description'), id: 'ecdsa'}
    ]"
    :disabled="isEdit"
    :ui="{itemDescription: 'whitespace-normal leading-snug'}"
    autocomplete="on"
    class="w-full"
  />
</UFormField>

<UFormField
  name="key_content"
  :label="t('form.passkeys.key_content.label')"
  :help="t('form.passkeys.key_content.help')"
  required
>
  <UTextarea v-model="state.key_content" class="w-full" :disabled="isEdit" />
</UFormField>

<PasswordStrength
  name="passphrase"
  v-model="state.passphrase"
  :label="t('form.passkeys.passphrase.label')"
  :help="t('form.passkeys.passphrase.help')"
  :check-strength="checkPasswordStrength"
  :disabled="disabledPassword || isEdit"
  optional
/>

<UFormField
  name="fingerprint"
  :label="t('form.passkeys.fingerprint.label')"
  :help="t('form.passkeys.fingerprint.help')"
>
  <UInput  v-model="state.fingerprint" autocomplete="off" class="w-full" :disabled="isEdit" />
</UFormField>
</template>