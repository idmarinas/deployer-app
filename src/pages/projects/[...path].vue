<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UError icon="i-tabler-package-off" :clear="false" :error="{
    statusCode: 404,
    statusMessage: t('components.error.project.statusMessage'),
    message: t('components.error.project.message')
  }" :ui="{ root: 'h-full min-h-full' }" />
</template>
