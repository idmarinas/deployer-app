<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { getModuleIcon } from '@/utils/icons'

const { t } = useI18n()
</script>

<template>
  <UError :icon="getModuleIcon('passkeys', 'off')" :clear="false" :error="{
    statusCode: 404,
    statusMessage: t('components.error.passkey.statusMessage'),
    message: t('components.error.passkey.message')
  }" :ui="{ root: 'h-full min-h-full' }" />
</template>
