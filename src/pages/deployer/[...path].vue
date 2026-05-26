<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UError icon="i-tabler-file-x" :clear="false" :error="{
    statusCode: 404,
    statusMessage: t('components.error.statusMessage'),
    message: t('components.error.message')
  }" />
</template>
