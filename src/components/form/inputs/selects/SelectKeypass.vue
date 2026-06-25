<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'
import { useSelectPasskeys } from '@/loaders/passkeys'
</script>

<script setup lang="ts">
const { t } = useI18n()
const { data: items, isLoading } = useSelectPasskeys()
</script>

<template>
  <USelectMenu
    value-key="id"
    :items="items as SelectMenuItem[]"
    :loading="isLoading"
    :disabled="isLoading"
    :placeholder="t('form.shared.placeholder.passkeys.select')"
  />
</template>