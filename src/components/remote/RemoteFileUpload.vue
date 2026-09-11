<script lang="ts">
import type { CommandResponse, RemoteTransferResult, RemoteUploadInput } from '@/types/tauri-types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { open } from '@tauri-apps/plugin-dialog'

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
		upload: (input: RemoteUploadInput) => Promise<CommandResponse<RemoteTransferResult> | null>
	}>(),
	{
		hostId: undefined,
	},
)

const { t } = useI18n()
const toast = useToaster()

const canOperate = computed(() => !props.isRunning && !!props.hostId)

// Upload
const uploadLocalPath = ref('')
const uploadRemotePath = ref('')
const uploadRecursive = ref(false)
const uploadChmod = ref('')

function notifySuccess(message: string) {
	toast.success(t('overlays.toast.title.success'), message)
}

function notifyFailure(message: string) {
	toast.error(t('overlays.toast.title.error'), message)
}

async function pickUploadFile() {
	const selected = await open({
		directory: false,
		multiple: false,
		title: t('components.console.upload.browse_file'),
	})
	if (typeof selected === 'string') uploadLocalPath.value = selected
}

async function pickUploadDir() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: t('components.console.upload.browse_dir'),
	})
	if (typeof selected === 'string') uploadLocalPath.value = selected
}

async function runUpload() {
	if (!props.hostId || !uploadLocalPath.value || !uploadRemotePath.value) return
	props.clear()

	const result = await props.upload({
		host_id: props.hostId,
		local_path: uploadLocalPath.value,
		remote_path: uploadRemotePath.value,
		overwrite: true,
		chmod: uploadChmod.value || null,
		recursive: uploadRecursive.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		notifySuccess(t('components.console.feedback.uploaded'))
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
					v-model="uploadLocalPath"
					class="flex-1 font-mono"
					:placeholder="t('components.console.upload.local_placeholder')"
					:disabled="!canOperate"
					autocomplete="off"
				/>
				<UButton
					:icon="ICONS.actions.folder"
					:label="t('components.console.upload.browse_file')"
					variant="outline"
					:disabled="!canOperate"
					@click="pickUploadFile"
				/>
				<UButton
					:icon="ICONS.actions.folderOpen"
					:label="t('components.console.upload.browse_dir')"
					variant="outline"
					:disabled="!canOperate"
					@click="pickUploadDir"
				/>
			</div>
			<div class="flex gap-2">
				<UInput
					v-model="uploadRemotePath"
					class="flex-1 font-mono"
					:placeholder="t('components.console.upload.remote_placeholder')"
					:disabled="!canOperate"
					autocomplete="off"
				/>
				<UInput
					v-model="uploadChmod"
					class="w-40"
					:placeholder="t('components.console.upload.chmod_placeholder')"
					:disabled="!canOperate"
					autocomplete="off"
				/>
				<UButton
					:icon="ICONS.taskType.upload_file"
					:label="t('components.console.upload.submit')"
					color="success"
					variant="outline"
					:loading="isRunning"
					:disabled="!hostId || !uploadLocalPath || !uploadRemotePath"
					@click="runUpload"
				/>
			</div>
			<USwitch v-model="uploadRecursive" :label="t('components.console.upload.recursive')" :disabled="!canOperate" />
		</div>
	</div>
</template>
