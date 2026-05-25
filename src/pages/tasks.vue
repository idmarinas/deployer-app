<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useNavigationMenu'

const { t } = useI18n()
const { tasksToolbar } = useDashboardToolbar()

definePage({
  meta: {
    layout: 'default'
  }
})
</script>

<template>
  <UDashboardPanel id="tasks">
    <template #header>
      <UDashboardNavbar icon="i-tabler-list-check" :title="t('pages.tasks.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="tasksToolbar" highlight orientation="horizontal" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>