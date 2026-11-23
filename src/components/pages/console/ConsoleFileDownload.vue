<script lang="ts">
import type { CommandResponse, RemoteDownloadInput, RemoteDownloadResult } from '@/types/tauri-types'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { open, save } from '@tauri-apps/plugin-dialog'

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
		appendOutput: (text: string) => void
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
const downloadMode = ref<'auto' | 'file' | 'dir'>('auto')
const downloadOverwrite = ref(true)
const downloadReconnectAttempts = ref<number | null>(3)

/** `recursive` es tri-estado en el backend: directorio, archivo o autodetección. */
const downloadRecursive = computed<boolean | null>(() => {
	if (downloadMode.value === 'dir') return true
	if (downloadMode.value === 'file') return false
	return null
})

interface DownloadModeOption {
	value: 'auto' | 'file' | 'dir'
	label: string
}

const downloadModes = computed<DownloadModeOption[]>(() => [
	{ value: 'auto', label: t('components.console.download.mode_auto') },
	{ value: 'file', label: t('components.console.download.mode_file') },
	{ value: 'dir', label: t('components.console.download.mode_dir') },
])

function notifySuccess(message: string) {
	toast.success(t('overlays.toast.title.success'), message)
}

function notifyFailure(message: string) {
	toast.error(t('overlays.toast.title.error'), message)
}

/** La razón viaja en la respuesta; el prop `errorMessage` puede ser aún el del render anterior. */
function failureReason(result: CommandResponse<RemoteDownloadResult> | null): string {
	if (!result) return props.errorMessage
	return result.message_params.reason || t(result.message_key, result.message_params)
}

async function pickDownloadPath() {
	const selected =
		downloadMode.value === 'dir'
			? await open({
					directory: true,
					multiple: false,
					title: t('components.console.download.browse_dir'),
				})
			: await save({
					title: t('components.console.download.browse'),
				})

	if (typeof selected === 'string') downloadLocalPath.value = selected
}

async function runDownload() {
	if (!props.hostId || !downloadRemotePath.value || !downloadLocalPath.value) return
	props.clear()

	const result = await props.download({
		host_id: props.hostId,
		remote_path: downloadRemotePath.value,
		local_path: downloadLocalPath.value,
		overwrite: downloadOverwrite.value,
		recursive: downloadRecursive.value,
		ssh_reconnect_attempts: downloadReconnectAttempts.value,
	})

	if (result?.success) {
		const savedTo = result.data?.saved_to
		notifySuccess(
			savedTo
				? t('components.console.feedback.saved_to', { path: savedTo })
				: t('components.console.feedback.downloaded'),
		)
		if (savedTo) {
			props.appendOutput(`\n${t('components.console.feedback.saved_to', { path: savedTo })}\n`)
		}
	} else {
		notifyFailure(t('components.console.feedback.failed', { reason: failureReason(result) }))
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
			</div>
			<div class="flex gap-2">
				<UInput
					v-model="downloadLocalPath"
					class="flex-1 font-mono"
					:placeholder="t('components.console.download.local_placeholder')"
					:disabled="!canOperate"
					autocomplete="off"
				/>
				<UInput
					v-model.number="downloadReconnectAttempts"
					type="number"
					class="w-36"
					:placeholder="t('components.console.download.reconnect_attempts_placeholder')"
					:disabled="!canOperate"
				/>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<USelect
					v-model="downloadMode"
					:items="downloadModes"
					:placeholder="t('components.console.download.mode_placeholder')"
					:disabled="!canOperate"
					class="w-48"
				/>
				<USwitch
					v-model="downloadOverwrite"
					:label="t('components.console.download.overwrite')"
					:disabled="!canOperate"
				/>
			</div>
			<div class="flex items-center gap-2">
				<UButton
					:icon="ICONS.taskType.download_file"
					:label="t('components.console.download.submit')"
					color="info"
					variant="outline"
					:loading="isRunning"
					:disabled="!hostId || !downloadRemotePath || !downloadLocalPath"
					@click="runDownload"
				/>
				<UButton
					v-if="isRunning"
					:icon="ICONS.actions.stop"
					:label="t('components.console.console.cancel')"
					color="error"
					variant="soft"
					@click="cancel"
				/>
			</div>
		</div>
	</div>
</template>
