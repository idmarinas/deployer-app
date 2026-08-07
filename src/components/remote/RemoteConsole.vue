<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { open, save } from '@tauri-apps/plugin-dialog'

import SelectHost from '@/components/form/selects/SelectHost.vue'
import useRemoteCommand from '@/composables/useRemoteCommand'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

const props = withDefaults(
	defineProps<{
		/** Host fijo. Si no se pasa, el componente muestra un selector de servidores. */
		hostId?: number
		hideHostSelector?: boolean
	}>(),
	{
		hostId: undefined,
		hideHostSelector: false,
	},
)

const { t } = useI18n()
const toast = useToaster()

const { output, isRunning, lastExitCode, errorMessage, clear, execute, upload, download, cancel } =
	useRemoteCommand()

// Host: prop fija o selector interno
const localHostId = ref<number | undefined>(props.hostId)
const selectedHostId = computed(() => props.hostId ?? localHostId.value)

// Comando
const command = ref('')
const workingDir = ref('')
const timeoutSecs = ref<number | null>(null)

// Upload
const uploadLocalPath = ref('')
const uploadRemotePath = ref('')
const uploadRecursive = ref(false)
const uploadChmod = ref('')

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

async function runCommand() {
	if (!selectedHostId.value || !command.value.trim()) return
	clear()

	const result = await execute({
		host_id: selectedHostId.value,
		command: command.value,
		working_dir: workingDir.value || null,
		timeout_secs: timeoutSecs.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		notifySuccess(t('pages.console.feedback.executed'))
	} else {
		notifyFailure(t('pages.console.feedback.failed', { reason: errorMessage.value }))
	}
}

async function pickUploadFile() {
	const selected = await open({
		directory: false,
		multiple: false,
		title: t('pages.console.upload.browse_file'),
	})
	if (typeof selected === 'string') uploadLocalPath.value = selected
}

async function pickUploadDir() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: t('pages.console.upload.browse_dir'),
	})
	if (typeof selected === 'string') uploadLocalPath.value = selected
}

async function runUpload() {
	if (!selectedHostId.value || !uploadLocalPath.value || !uploadRemotePath.value) return
	clear()

	const result = await upload({
		host_id: selectedHostId.value,
		local_path: uploadLocalPath.value,
		remote_path: uploadRemotePath.value,
		overwrite: true,
		chmod: uploadChmod.value || null,
		recursive: uploadRecursive.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		notifySuccess(t('pages.console.feedback.uploaded'))
	} else {
		notifyFailure(t('pages.console.feedback.failed', { reason: errorMessage.value }))
	}
}

async function pickDownloadPath() {
	const selected = await save({
		title: t('pages.console.download.browse'),
	})
	if (typeof selected === 'string') downloadLocalPath.value = selected
}

async function runDownload() {
	if (!selectedHostId.value || !downloadRemotePath.value) return
	clear()

	const result = await download({
		host_id: selectedHostId.value,
		remote_path: downloadRemotePath.value,
		local_path: downloadLocalPath.value || null,
		overwrite: true,
		recursive: downloadRecursive.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		const savedTo = result.data?.saved_to
		notifySuccess(
			savedTo ? t('pages.console.feedback.saved_to', { path: savedTo }) : t('pages.console.feedback.downloaded'),
		)
	} else {
		notifyFailure(t('pages.console.feedback.failed', { reason: errorMessage.value }))
	}
}

const canOperate = computed(() => !isRunning.value && !!selectedHostId.value)
</script>

<template>
	<div class="flex flex-col gap-6">
		<!-- Selector de host (solo si no viene fijado por prop) -->
		<div v-if="!hostId && !hideHostSelector" class="flex flex-col gap-2">
			<UFormField :label="t('pages.console.host.label')">
				<SelectHost v-model="localHostId" only-enabled />
			</UFormField>
			<p v-if="!selectedHostId" class="text-sm text-muted">{{ t('pages.console.host.required') }}</p>
		</div>

		<UTabs
			:items="[
				{ label: t('pages.console.sections.command'), slot: 'command' },
				{ label: t('pages.console.sections.upload'), slot: 'upload' },
				{ label: t('pages.console.sections.download'), slot: 'download' },
			]"
		>
			<!-- Ejecutar comando -->
			<template #command>
				<div class="flex flex-col gap-3">
					<div class="flex gap-2">
						<UInput
							v-model="command"
							class="flex-1 font-mono"
							:placeholder="t('pages.console.command.command_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
							spellcheck="false"
							@keydown.enter="runCommand"
						/>
						<UButton
							:icon="ICONS.server.terminal"
							:label="t('pages.console.command.run')"
							:loading="isRunning"
							:disabled="!selectedHostId || !command.trim()"
							@click="runCommand"
						/>
					</div>
					<div class="flex gap-2">
						<UInput
							v-model="workingDir"
							class="flex-1"
							:placeholder="t('pages.console.command.working_dir_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
						/>
						<UInput
							v-model.number="timeoutSecs"
							type="number"
							class="w-32"
							:placeholder="t('pages.console.command.timeout_placeholder')"
							:disabled="!canOperate"
						/>
					</div>
				</div>
			</template>

			<!-- Subir archivo -->
			<template #upload>
				<div class="flex flex-col gap-3">
					<div class="flex gap-2">
						<UInput
							v-model="uploadLocalPath"
							class="flex-1 font-mono"
							:placeholder="t('pages.console.upload.local_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
						/>
						<UButton
							:icon="ICONS.actions.folder"
							:label="t('pages.console.upload.browse_file')"
							variant="outline"
							:disabled="!canOperate"
							@click="pickUploadFile"
						/>
						<UButton
							:icon="ICONS.actions.folderOpen"
							:label="t('pages.console.upload.browse_dir')"
							variant="outline"
							:disabled="!canOperate"
							@click="pickUploadDir"
						/>
					</div>
					<div class="flex gap-2">
						<UInput
							v-model="uploadRemotePath"
							class="flex-1 font-mono"
							:placeholder="t('pages.console.upload.remote_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
						/>
						<UInput
							v-model="uploadChmod"
							class="w-40"
							:placeholder="t('pages.console.upload.chmod_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
						/>
						<UButton
							:icon="ICONS.taskType.upload_file"
							:label="t('pages.console.upload.submit')"
							color="success"
							variant="outline"
							:loading="isRunning"
							:disabled="!selectedHostId || !uploadLocalPath || !uploadRemotePath"
							@click="runUpload"
						/>
					</div>
					<USwitch v-model="uploadRecursive" :label="t('pages.console.upload.recursive')" :disabled="!canOperate" />
				</div>
			</template>

			<!-- Descargar archivo -->
			<template #download>
				<div class="flex flex-col gap-3">
					<div class="flex gap-2">
						<UInput
							v-model="downloadRemotePath"
							class="flex-1 font-mono"
							:placeholder="t('pages.console.download.remote_placeholder')"
							:disabled="!canOperate"
							autocomplete="off"
						/>
						<UButton
							:icon="ICONS.actions.folder"
							:label="t('pages.console.download.browse')"
							variant="outline"
							:disabled="!canOperate"
							@click="pickDownloadPath"
						/>
						<UButton
							:icon="ICONS.taskType.download_file"
							:label="t('pages.console.download.submit')"
							color="info"
							variant="outline"
							:loading="isRunning"
							:disabled="!selectedHostId || !downloadRemotePath"
							@click="runDownload"
						/>
					</div>
					<UInput
						v-model="downloadLocalPath"
						class="font-mono"
						:placeholder="t('pages.console.download.local_placeholder')"
						:disabled="!canOperate"
						autocomplete="off"
					/>
					<USwitch v-model="downloadRecursive" :label="t('pages.console.download.recursive')" :disabled="!canOperate" />
				</div>
			</template>
		</UTabs>

		<USeparator />

		<!-- Salida -->
		<section class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
						{{ t('pages.console.console.title') }}
					</h3>
					<UBadge
						v-if="isRunning"
						color="info"
						variant="subtle"
						:icon="ICONS.status.loading"
						:label="t('pages.console.console.running')"
					/>
					<UBadge
						v-else-if="lastExitCode !== null"
						:color="lastExitCode === 0 ? 'success' : 'error'"
						variant="subtle"
						:icon="lastExitCode === 0 ? ICONS.status.circleCheck : ICONS.status.circleX"
						:label="t('pages.console.console.exit_code', { code: lastExitCode })"
					/>
				</div>
			<div class="flex items-center gap-2">
				<UButton
					v-if="isRunning"
					:icon="ICONS.actions.stop"
					:label="t('pages.console.console.cancel')"
					color="error"
					variant="outline"
					size="xs"
					@click="cancel"
				/>
				<UButton
					v-if="output"
					:icon="ICONS.actions.reset"
					:label="t('pages.console.console.clear')"
					variant="ghost"
					color="neutral"
					size="xs"
					@click="clear"
				/>
			</div>
			</div>

			<UCard :ui="{ root: 'bg-neutral-950 text-green-400' }">
				<pre v-if="output || errorMessage" class="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96">{{
					errorMessage ? `${output}${errorMessage}\n` : output
				}}</pre>
				<p v-else class="font-mono text-xs text-muted">{{ t('pages.console.console.placeholder') }}</p>
			</UCard>
		</section>
	</div>
</template>
