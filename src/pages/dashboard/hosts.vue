<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router';

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <UDashboardPanel id="hosts">
    <template #header>
      <UDashboardNavbar icon="i-tabler-cloud-network" :title="t('pages.hosts.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

      <template #right>
        <UButton
            v-if="!route.path.endsWith('/create')"
          to="/dashboard/hosts/create"
          icon="i-tabler-plus"
          variant="outline"
          :label="t('components.navigation.create.host.label')"
        />
      </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>