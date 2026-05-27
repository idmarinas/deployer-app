<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbarProvider } from '@/composables/useDashboardToolbar'

const { t } = useI18n()

const { toolbarContent } = useDashboardToolbarProvider('deployments')
</script>

<template>
  <UDashboardPanel id="deployments">
    <template #header>
      <UDashboardNavbar icon="i-tabler-send" :title="t('pages.deployments.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <!-- Solo muestra el toolbar si tiene contenido -->
      <UDashboardToolbar v-if="toolbarContent" class=" flex gap-2 justify-between">
        <component v-for="(content, index) in toolbarContent" :key="index" :is="content" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>