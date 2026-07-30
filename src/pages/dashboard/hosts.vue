<script setup lang="ts">
import { useDashboardToolbarProvider } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useDashboardToolbarProvider('hosts')
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
						v-if="!route.path.endsWith('/add')"
						to="/dashboard/hosts/add"
						icon="i-tabler-plus"
						variant="outline"
						:label="t('components.navigation.add.host.label')"
					/>
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
