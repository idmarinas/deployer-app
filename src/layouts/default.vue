<!-- Layout por defecto Dashboard -->

<script setup lang="ts">
import { useSideberMenu } from '@/composables/useNavigationMenu'

const { navigationMenu, searchGroups } = useSideberMenu()

</script>

<template>
  <UDashboardGroup storage="local" unit="rem">
    <UDashboardSidebar id="default" collapsible resizable :min-size="15" :default-size="20"
      :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <ProjectsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" tooltip />

        <UNavigationMenu :collapsed="collapsed" :items="navigationMenu" />
      </template>

      <template #footer="{ collapsed }">
        <DeployerAppMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <RouterView />
  </UDashboardGroup>
</template>