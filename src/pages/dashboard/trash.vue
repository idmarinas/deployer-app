<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ModulesName } from '@/utils/deployer-app'
import { ICONS } from '@/utils/icons'

definePage({
	name: 'dashboard-trash',
})

const { t } = useI18n()

const groups = [ModulesName.Variables, ModulesName.Hosts, ModulesName.Commands, ModulesName.Passkeys]
</script>

<template>
	<UDashboardPanel id="trash">
		<template #header>
			<UDashboardNavbar :icon="ICONS.actions.trash" :title="t('components.sidebar.trash')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col gap-6">
				<template v-for="(module, index) in groups" :key="module">
					<USeparator v-if="index > 0" />
					<TrashTable :module="module" />
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
