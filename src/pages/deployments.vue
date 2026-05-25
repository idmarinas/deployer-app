<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useNavigationMenu'

const { t } = useI18n()
const { deploymentsToolbar } = useDashboardToolbar()

definePage({
  meta: {
    layout: 'default'
  }
})
</script>

<template>
  <UDashboardPanel id="deployments">
    <template #header>
      <UDashboardNavbar icon="i-tabler-send" :title="t('pages.deployments.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="deploymentsToolbar" highlight orientation="horizontal" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>