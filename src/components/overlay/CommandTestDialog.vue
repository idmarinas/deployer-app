<script lang="ts">
import type { OutputParser } from '@/utils/commands/types'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SelectHost from '@/components/form/selects/SelectHost.vue'
import RemoteOutput from '@/components/remote/RemoteOutput.vue'
import { runCommand, runCustomCommand } from '@/utils/commands/runner'
import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const emits = defineEmits<{
	close: [value: boolean]
}>()
const props = defineProps<{
	title?: string
	description?: string
	command: string
	parser?: OutputParser
	timeout?: number
	/**
	 * Si se pasa un key existente en BD, se ejecuta vía `runCommand` (la BD es
	 * la fuente de la definición). Si no, se ejecuta el comando ad-hoc del
	 * formulario (aún no guardado) vía `runCustomCommand`.
	 */
	commandKey?: string
}>()

const { t } = useI18n()

const hostId = ref<number | undefined>()
const isLoading = ref(false)
const output = ref('')
const lastExitCode = ref<number | null>(null)
const errorMessage = ref('')

async function run() {
	if (!hostId.value) return

	isLoading.value = true
	errorMessage.value = ''
	output.value = ''
	lastExitCode.value = null

	try {
		const result = props.commandKey
			? await runCommand(props.commandKey, hostId.value)
			: await runCustomCommand(
					{
						id: props.commandKey ?? 'ad-hoc',
						name: props.title ?? 'ad-hoc',
						command: props.command,
						parser: props.parser ?? { type: 'raw' },
						timeout_secs: props.timeout,
					},
					hostId.value,
				)

		output.value = result.raw_output
		lastExitCode.value = result.exit_code
	} catch (e) {
		errorMessage.value = String(e)
	} finally {
		isLoading.value = false
	}
}

function clearOutput() {
	output.value = ''
	lastExitCode.value = null
	errorMessage.value = ''
}
</script>

<template>
	<UModal
		:title="title ?? t('dialogs.commands.test.title')"
		:dismissible="false"
		:ui="{ content: 'max-w-3xl', footer: 'justify-end' }"
	>
		<template #body>
			<div class="flex flex-col gap-4">
				<div class="flex items-center gap-2">
					<UFormField
						name="host_id"
						:label="t('dialogs.commands.test.host.label')"
						:help="t('dialogs.commands.test.host.help')"
						class="flex-1"
						required
					>
						<SelectHost v-model="hostId" :only-enabled="true" />
					</UFormField>
					<UButton
						:label="t('dialogs.commands.test.run')"
						:icon="ICONS.actions.play"
						:loading="isLoading"
						:disabled="!hostId || isLoading"
						variant="outline"
						color="primary"
						@click="run"
					/>
				</div>

				<RemoteOutput
					:last-exit-code="lastExitCode"
					:is-running="isLoading"
					:error-message="errorMessage"
					:output="output"
					:clear="clearOutput"
				/>
			</div>
		</template>
		<template #footer>
			<UButton
				:label="t('form.cancel')"
				:icon="ICONS.actions.cancel"
				color="neutral"
				variant="outline"
				@click="emits('close', false)"
			/>
		</template>
	</UModal>
</template>
