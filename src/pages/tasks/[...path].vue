<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UError icon="i-tabler-x" :clear="false" :error="{
    statusCode: 404,
    statusMessage: t('components.error.task.statusMessage'),
    message: t('components.error.task.message')
  }" :ui="{ root: 'h-full min-h-full' }" />
</template>
