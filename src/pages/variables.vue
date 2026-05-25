<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useNavigationMenu'

const { t } = useI18n()
const { variablesToolbar } = useDashboardToolbar()

definePage({
  meta: {
    layout: 'default'
  }
})
</script>

<template>
  <UDashboardPanel id="variables">
    <template #header>
      <UDashboardNavbar icon="i-tabler-variable" :title="t('pages.variables.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="variablesToolbar" highlight orientation="horizontal" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>