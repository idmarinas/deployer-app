<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDashboardButton } from '@/composables/useNavigationMenu'
import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'

const { t } = useI18n()

definePage({
	name: 'dashboard-home',
})

const dashboardButton = useDashboardButton()

onMounted(async () => {})
</script>

<template>
	<UDashboardPanel id="home">
		<template #header>
			<UDashboardNavbar icon="i-tabler-dashboard" :title="t('pages.home.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>

				<template #right>
					<UDropdownMenu :items="dashboardButton">
						<UButton :icon="ICONS.actions.add" square class="rounded-full" />
					</UDropdownMenu>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<DashboardSummary :module="ModulesName.Hosts" />
				<DashboardSummary :module="ModulesName.Passkeys" />
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<DashboardLastItems :module="ModulesName.Hosts" />
				<DashboardLastItems :module="ModulesName.Passkeys" />
			</div>
		</template>
	</UDashboardPanel>
</template>
