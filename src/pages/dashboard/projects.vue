<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <UDashboardPanel id="projects">
    <template #header>
      <UDashboardNavbar icon="i-tabler-packages" :title="t('pages.projects.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/dashboard/projects/create"
            icon="i-tabler-plus"
            variant="outline"
            :disabled="route.path.endsWith('/create')"
            :label="t('components.navigation.create.project.label')"
          />
      </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>