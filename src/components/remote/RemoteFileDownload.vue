<script lang="ts">
import type { CommandResponse, RemoteDownloadInput, RemoteDownloadResult } from '@/types/tauri-types'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { save } from '@tauri-apps/plugin-dialog'

import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		hostId?: number
		isRunning: boolean
		errorMessage: string
		clear: () => void
		cancel: () => void
		download: (input: RemoteDownloadInput) => Promise<CommandResponse<RemoteDownloadResult> | null>
	}>(),
	{
		hostId: undefined,
	},
)

const { t } = useI18n()
const toast = useToaster()

const canOperate = computed(() => !props.isRunning && !!props.hostId)

// Download
const downloadRemotePath = ref('')
const downloadLocalPath = ref('')
const downloadRecursive = ref(false)

function notifySuccess(message: string) {
	toast.success(t('overlays.toast.title.success'), message)
}

function notifyFailure(message: string) {
	toast.error(t('overlays.toast.title.error'), message)
}

async function pickDownloadPath() {
	const selected = await save({
		title: t('components.console.download.browse'),
	})
	if (typeof selected === 'string') downloadLocalPath.value = selected
}

async function runDownload() {
	if (!props.hostId || !downloadRemotePath.value) return
	props.clear()

	const result = await props.download({
		host_id: props.hostId,
		remote_path: downloadRemotePath.value,
		local_path: downloadLocalPath.value || null,
		overwrite: true,
		recursive: downloadRecursive.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		const savedTo = result.data?.saved_to
		notifySuccess(
			savedTo
				? t('components.console.feedback.saved_to', { path: savedTo })
				: t('components.console.feedback.downloaded'),
		)
	} else {
		notifyFailure(t('components.console.feedback.failed', { reason: props.errorMessage }))
	}
}
</script>

<template>
	<div class="flex flex-col gap-6">
		<UAlert v-if="!props.hostId" color="warning" :description="t('components.console.host.required')" variant="soft" />

		<div class="flex flex-col gap-3">
			<div class="flex gap-2">
				<UInput
					v-model="downloadRemotePath"
					class="flex-1 font-mono"
					:placeholder="t('components.console.download.remote_placeholder')"
					:disabled="!canOperate"
				/>
				<UButton
					:icon="ICONS.actions.folder"
					:label="t('components.console.download.browse')"
					variant="outline"
					:disabled="!canOperate"
					@click="pickDownloadPath"
				/>
				<UButton
					:icon="ICONS.taskType.download_file"
					:label="t('components.console.download.submit')"
					color="info"
					variant="outline"
					:loading="isRunning"
					:disabled="!hostId || !downloadRemotePath"
					@click="runDownload"
				/>
			</div>
			<UInput
				v-model="downloadLocalPath"
				class="font-mono"
				:placeholder="t('components.console.download.local_placeholder')"
				:disabled="!canOperate"
				autocomplete="off"
			/>
			<USwitch
				v-model="downloadRecursive"
				:label="t('components.console.download.recursive')"
				:disabled="!canOperate"
			/>
		</div>
	</div>
</template>
