<script setup lang="ts">
import { useToolbarForCommandsModule } from '@/composables/dashboard/toolbar/useToolbarForModule'
import { getModuleIcon, ICONS } from '@/utils/icons'
import { ModulesName } from '@/utils/deployer-app'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const { toolbarContent } = useToolbarForCommandsModule()
</script>

<template>
	<UDashboardPanel id="commands">
		<template #header>
			<UDashboardNavbar :icon="getModuleIcon(ModulesName.Commands)" :title="t('pages.commands.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>

				<template #right>
					<UButton
						v-if="!route.path.endsWith('/add')"
						to="/dashboard/commands/add"
						:icon="ICONS.actions.add"
						variant="outline"
						:label="t('components.navigation.add.command.label')"
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