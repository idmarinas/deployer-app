<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'
import { useHostSelectPopulate } from '@/loaders/hosts'

type SelectMenuItemExtends = SelectMenuItem & {
  id: number
  username: string
  enabled: boolean
}
</script>

<script setup lang="ts">
const { t } = useI18n()
const { data: items, isLoading } = useHostSelectPopulate()
</script>

<template>
  <USelectMenu
    clear
    value-key="id"
    :items="items as SelectMenuItemExtends[]"
    :loading="isLoading"
    :disabled="isLoading"
    :placeholder="t('form.shared.placeholder.hosts.select')"
    icon="i-tabler-server"
  >
    <template #item-leading="{ item }">
      <UBadge :color="item.enabled ? 'success' : 'error'" variant="outline" :icon="item.enabled ? 'i-tabler-server' : 'i-tabler-server-off'" size="sm" />
    </template>
    <template #item-trailing="{ item }">
      <UBadge color="neutral" variant="outline" icon="i-tabler-user" size="sm">{{ item.username }}</UBadge>
    </template>
  </USelectMenu>
</template>