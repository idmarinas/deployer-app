<script lang="ts">
import type { ManagedFile } from '@/lib/files'

import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const state = defineModel<{
	name: string
	description?: string
	host_id?: number
	remote_path: string
	enabled: boolean
	files: ManagedFile[]
}>({ required: true })
const props = defineProps<{
	isLoading: boolean
}>()

const { t } = useI18n()
</script>

<template>
	<UFormField
		name="name"
		:label="t('form.docker_composes.name.label')"
		:help="t('form.docker_composes.name.help')"
		required
	>
		<UInput
			v-model="state.name"
			autocomplete="off"
			class="w-full"
			:ui="{ trailing: 'pointer-events-none' }"
			maxlength="120"
		>
			<template #trailing>
				<div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
					{{ state.name?.length ?? 0 }}/120
				</div>
			</template>
		</UInput>
	</UFormField>

	<UFormField
		name="description"
		:label="t('form.docker_composes.description.label')"
		:help="t('form.docker_composes.description.help')"
		:hint="t('form.shared.hint.optional')"
	>
		<DescriptionEditor v-model="state.description" />
	</UFormField>

	<UFormField
		name="host_id"
		:label="t('form.docker_composes.host_id.label')"
		:help="t('form.docker_composes.host_id.help')"
	>
		<SelectHost v-model="state.host_id" class="w-full" />
	</UFormField>

	<UFormField
		name="remote_path"
		:label="t('form.docker_composes.remote_path.label')"
		:help="t('form.docker_composes.remote_path.help')"
		required
	>
		<UInput v-model="state.remote_path" class="w-full font-mono" placeholder="/opt/docker-compose/" />
	</UFormField>

	<USeparator class="my-3 col-span-full" />
	<ComposeTreeFilesUpload v-model="state.files" class="col-span-full" can-create-file can-edit can-upload />
</template>
