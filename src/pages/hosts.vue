<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useDashboardToolbar'

const { t } = useI18n()
const { hostsToolbar } = useDashboardToolbar()

definePage({
  meta: {
    layout: 'default'
  }
})
</script>

<template>
  <UDashboardPanel id="hosts">
    <template #header>
      <UDashboardNavbar icon="i-tabler-cloud-network" :title="t('pages.hosts.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="hostsToolbar" highlight orientation="horizontal" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>