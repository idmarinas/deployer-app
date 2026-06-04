<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useDashboardToolbarProvider } from '@/composables/useDashboardToolbar'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useDashboardToolbarProvider('variables')
</script>

<template>
  <UDashboardPanel id="variables">
    <template #header>
      <UDashboardNavbar icon="i-tabler-variable" :title="t('pages.variables.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="!route.path.endsWith('/add')"
            to="/dashboard/variables/add"
            icon="i-tabler-plus"
            variant="outline"
            :label="t('components.navigation.add.variable.label')"
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