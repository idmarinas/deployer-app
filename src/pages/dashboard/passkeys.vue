<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <UDashboardPanel id="passkeys">
    <template #header>
      <UDashboardNavbar icon="i-tabler-key" :title="t('pages.passkeys.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/dashboard/passkeys/create"
            icon="i-tabler-plus"
            variant="outline"
            :disabled="route.path.endsWith('/create')"
            :label="t('components.navigation.create.passkey.label')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>