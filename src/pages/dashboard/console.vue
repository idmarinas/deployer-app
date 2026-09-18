<script lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import useRemoteCommand from '@/composables/useRemoteCommand'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-console',
})

const hostId = ref<number | undefined>(undefined)

const { t } = useI18n()

const { output, isRunning, lastExitCode, errorMessage, clear, execute, upload, download, cancel } = useRemoteCommand()
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
			<UTabs
				:items="[
					{ label: t('pages.console.sections.command'), icon: ICONS.server.terminal, slot: 'command' },
					{
						label: t('pages.console.sections.upload'),
						icon: ICONS.taskType.upload_file,
						slot: 'upload',
						disabled: true,
					},
					{
						label: t('pages.console.sections.download'),
						icon: ICONS.taskType.download_file,
						slot: 'download',
						disabled: true,
					},
				]"
			>
				<template #command>
					<RemoteCommand
						:host-id="hostId"
						:error-message="errorMessage"
						:is-running="isRunning"
						:execute="execute"
						:clear="clear"
						:cancel="cancel"
				/></template>
				<template #upload>
					<RemoteFileUpload
						:host-id="hostId"
						:error-message="errorMessage"
						:is-running="isRunning"
						:upload="upload"
						:clear="clear"
						:cancel="cancel"
				/></template>
				<template #download>
					<RemoteFileDownload
						:host-id="hostId"
						:error-message="errorMessage"
						:is-running="isRunning"
						:download="download"
						:clear="clear"
						:cancel="cancel"
				/></template>
			</UTabs>

			<USeparator />

			<RemoteOutput
				:output="output"
				:last-exit-code="lastExitCode"
				:error-message="errorMessage"
				:is-running="isRunning"
				:clear="clear"
			/>
		</template>
	</UDashboardPanel>
</template>
