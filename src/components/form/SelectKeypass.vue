<script setup lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { usePasskeysQuery } from '@/composables/queries/passkeys'
import { useQueryState } from '@/composables/useQueryState'

const { t } = useI18n()
const { populateSelectOptions } = usePasskeysQuery()

const { data: items, loading: isLoading, execute } = useQueryState(populateSelectOptions)

onMounted(() => {
  execute()
})

</script>

<template>
  <USelectMenu
    value-key="id"
    :items="items as SelectMenuItem[]"
    :loading="isLoading"
    :disabled="isLoading"
    :placeholder="t('schemas.form.placeholder.passkeys.select')"
  />
</template>