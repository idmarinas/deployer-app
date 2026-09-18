<script setup lang="ts">
import type { CommandResponse, RemoteCommandInput, RemoteCommandResult } from '@/types/tauri-types'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

const props = withDefaults(
	defineProps<{
		hostId?: number
		isRunning: boolean
		errorMessage: string
		clear: () => void
		cancel: () => void
		execute: (input: RemoteCommandInput) => Promise<CommandResponse<RemoteCommandResult> | null>
	}>(),
	{
		hostId: undefined,
	},
)

const { t } = useI18n()
const toast = useToaster()

// Comando
const command = ref('')
const workingDir = ref('/')
const timeoutSecs = ref<number | null>(null)

const canOperate = computed(() => !props.isRunning && !!props.hostId)

function notifySuccess(message: string) {
	toast.success(t('overlays.toast.title.success'), message)
}

function notifyFailure(message: string) {
	toast.error(t('overlays.toast.title.error'), message)
}

async function runCommand() {
	if (!props.hostId || !command.value.trim()) return
	props.clear()

	const result = await props.execute({
		host_id: props.hostId,
		command: command.value,
		working_dir: workingDir.value || null,
		timeout_secs: timeoutSecs.value,
		ssh_reconnect_attempts: 3,
	})

	if (result?.success) {
		notifySuccess(t('components.console.feedback.executed'))
	} else {
		notifyFailure(t('components.console.feedback.failed', { reason: props.errorMessage }))
	}
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<UAlert v-if="!props.hostId" color="warning" :description="t('components.console.host.required')" variant="soft" />

		<div class="flex flex-col gap-3">
			<div class="flex gap-2">
				<UInput
					v-model="workingDir"
					:icon="ICONS.misc.workingdir"
					class="flex-1"
					:placeholder="t('components.console.command.working_dir_placeholder')"
					:disabled="!canOperate"
					autocomplete="off"
				/>
				<UInput
					v-model.number="timeoutSecs"
					type="number"
					class="w-32"
					:placeholder="t('components.console.command.timeout_placeholder')"
					:disabled="!canOperate"
				/>
			</div>
			<UTextarea
				v-model="command"
				class="flex-1 font-mono"
				:placeholder="t('components.console.command.command_placeholder')"
				:disabled="!canOperate"
				autoresize
				spellcheck="false"
			/>
			<div class="flex items-center gap-2">
				<UButton
					:icon="ICONS.server.terminal"
					:label="t('components.console.command.run')"
					:loading="isRunning"
					:disabled="!props.hostId || !command.trim()"
					@click="runCommand"
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
