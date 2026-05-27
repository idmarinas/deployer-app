<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
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
            v-if="!route.path.endsWith('/create')"
            to="/dashboard/variables/create"
            icon="i-tabler-plus"
            variant="outline"
            :label="t('components.navigation.create.variable.label')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>