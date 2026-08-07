<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import RemoteConsole from '@/components/remote/RemoteConsole.vue'
import { ICONS } from '@/utils/icons'

definePage({
	name: 'dashboard-console',
})

const { t } = useI18n()

const hostId = ref<number | undefined>(undefined)
</script>

<template>
	<UDashboardPanel id="console">
		<template #header>
			<UDashboardNavbar :icon="ICONS.server.terminal" :title="t('pages.console.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>

			<UDashboardToolbar class="flex gap-2 justify-between">
				<SelectHost v-model="hostId" only-enabled />
			</UDashboardToolbar>
		</template>
		<template #body>
			<div class="flex flex-col gap-6">
				<RemoteConsole :host-id="hostId" hide-host-selector />
			</div>
		</template>
	</UDashboardPanel>
</template>
