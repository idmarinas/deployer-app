<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useNavigationMenu'

const { t } = useI18n()
const { deploymentsToolbar } = useDashboardToolbar()
</script>

<template>
  <UDashboardPanel id="projects">
    <template #header>
      <UDashboardNavbar icon="i-tabler-packages" :title="t('pages.projects.title')">
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