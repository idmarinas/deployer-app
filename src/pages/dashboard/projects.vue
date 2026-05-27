<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useDashboardToolbarProvider } from '@/composables/useDashboardToolbar'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useDashboardToolbarProvider('projects')
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
            v-if="!route.path.endsWith('/create')"
            to="/dashboard/projects/create"
            icon="i-tabler-plus"
            variant="outline"
            :label="t('components.navigation.create.project.label')"
          />
        </template>
      </UDashboardNavbar>

      <!-- Solo muestra el toolbar si tiene contenido -->
      <UDashboardToolbar v-if="toolbarContent" class=" flex gap-2 justify-between">
        <component v-for="(content, index) in toolbarContent" :key="index" :is="content" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>