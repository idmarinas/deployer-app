<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardToolbar } from '@/composables/useNavigationMenu'

const { t } = useI18n()
const { passkeysToolbar } = useDashboardToolbar()

definePage({
  meta: {
    layout: 'default'
  }
})
</script>

<template>
  <UDashboardPanel id="passkeys">
    <template #header>
      <UDashboardNavbar icon="i-tabler-key" :title="t('pages.passkeys.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="passkeysToolbar" highlight orientation="horizontal" class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>