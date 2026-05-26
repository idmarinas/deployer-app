<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UDashboardPanel id="deployments">
    <template #header>
      <UDashboardNavbar icon="i-tabler-send" :title="t('pages.deployments.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>