<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UError icon="i-tabler-server-off" :clear="false" :error="{
    statusCode: 404,
    statusMessage: t('components.error.host.statusMessage'),
    message: t('components.error.host.message')
  }" :ui="{ root: 'h-full min-h-full' }" />
</template>
