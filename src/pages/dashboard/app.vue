<script lang="ts">
import { useDashboardToolbarProvider } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const { t } = useI18n()

const { toolbarContent } = useDashboardToolbarProvider()
</script>

<template>
	<UDashboardPanel id="app">
		<template #header>
			<UDashboardNavbar icon="i-tabler-settings" :title="t('pages.app.settings.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>

			<!-- Solo muestra el toolbar si tiene contenido -->
			<UDashboardToolbar v-if="toolbarContent" class="flex gap-2 justify-between">
				<component v-for="(content, index) in toolbarContent" :key="index" :is="content" />
			</UDashboardToolbar>
		</template>

		<template #body>
			<RouterView />
		</template>
	</UDashboardPanel>
</template>
