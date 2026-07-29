<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useDashboardToolbarProvider } from '@/composables/useDashboardToolbar'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useDashboardToolbarProvider('docker_composes')
</script>

<template>
  <UDashboardPanel id="docker_composes">
    <template #header>
      <UDashboardNavbar icon="i-tabler-brand-docker" :title="t('pages.docker_composes.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="!route.path.endsWith('/add')"
            to="/dashboard/docker_composes/add"
            icon="i-tabler-plus"
            variant="outline"
            :label="t('components.navigation.add.docker_compose.label')"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="toolbarContent" class="flex gap-2 justify-between">
        <component v-for="(content, index) in toolbarContent" :key="index" :is="content" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>
