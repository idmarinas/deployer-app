<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	description?: string
	task_type: 'command' | 'upload_file' | 'download_file' | 'script'
	command?: string
	timeout: number
	retry_count: number
	retry_delay: number
	enabled: boolean
}>({ required: true })

defineProps<{
	isLoading: boolean
}>()

const { t } = useI18n()

const needsCommand = computed(() => state.value.task_type === 'command' || state.value.task_type === 'script')
</script>

<template>
	<UFormField name="name" :label="t('form.tasks.name.label')" :help="t('form.tasks.name.help')" required>
		<UInput v-model="state.name" autocomplete="off" class="w-full" :ui="{ trailing: 'pointer-events-none' }" maxlength="120">
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.name?.length ?? 0 }}/120
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField
		name="task_type"
		:label="t('form.tasks.task_type.label')"
		:help="t('form.tasks.task_type.help')"
		required
	>
		<USelect
			v-model="state.task_type"
			value-key="value"
			:items="[
				{ label: t('form.tasks.task_type.select.command'), value: 'command', icon: ICONS.taskType.command },
				{ label: t('form.tasks.task_type.select.script'), value: 'script', icon: ICONS.taskType.script },
				{ label: t('form.tasks.task_type.select.upload_file'), value: 'upload_file', icon: ICONS.taskType.upload_file },
				{
					label: t('form.tasks.task_type.select.download_file'),
					value: 'download_file',
					icon: ICONS.taskType.download_file,
				},
			]"
			class="w-full"
		/>
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.tasks.description.label')"
		:help="t('form.tasks.description.help')"
		:hint="t('form.shared.hint.optional')"
		class="md:col-span-2"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<UFormField
		v-if="needsCommand"
		name="command"
		:label="
			state.task_type === 'script' ? t('form.tasks.command.label_script') : t('form.tasks.command.label_command')
		"
		:help="state.task_type === 'script' ? t('form.tasks.command.help_script') : t('form.tasks.command.help_command')"
		required
		class="md:col-span-2"
	>
		<UTextarea v-model="state.command" class="w-full font-mono" :rows="6" maxlength="10000" />
	</UFormField>
	<UAlert
		v-else
		:icon="ICONS.status.infoCircle"
		color="neutral"
		variant="soft"
		:title="t('form.tasks.command.file_transfer_notice.title')"
		:description="t('form.tasks.command.file_transfer_notice.description')"
		class="md:col-span-2"
	/>

	<UFormField name="timeout" :label="t('form.tasks.timeout.label')" :help="t('form.tasks.timeout.help')" required>
		<UInputNumber v-model="state.timeout" class="w-full" :min="1" :max="86400" />
	</UFormField>

	<UFormField
		name="retry_count"
		:label="t('form.tasks.retry_count.label')"
		:help="t('form.tasks.retry_count.help')"
		required
	>
		<UInputNumber v-model="state.retry_count" class="w-full" :min="0" :max="20" />
	</UFormField>

	<UFormField
		name="retry_delay"
		:label="t('form.tasks.retry_delay.label')"
		:help="t('form.tasks.retry_delay.help')"
		required
	>
		<UInputNumber v-model="state.retry_delay" class="w-full" :min="0" :max="3600" />
	</UFormField>
</template>
