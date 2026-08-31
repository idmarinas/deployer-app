<script lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ComposeMode } from '@/lib/docker-compose/types'
</script>

<script setup lang="ts">
const { t } = useI18n()

const model = defineModel<string | null>({ required: true })

const editMode = ref<ComposeMode>('form')

function currentContent(): string {
	return model.value ?? ''
}

function writeContent(content: string) {
	model.value = content
}

function switchMode(mode: ComposeMode) {
	if (mode === editMode.value) return
	editMode.value = mode
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-end gap-3">
			<UBadge variant="subtle" color="secondary">{{ t('form.projects.docker.compose.mode.label') }}</UBadge>
			<div class="flex gap-1 p-1 bg-muted rounded-lg w-fit">
				<UButton
					:label="t('form.projects.docker.compose.mode.form')"
					:variant="editMode === 'form' ? 'solid' : 'ghost'"
					:color="editMode === 'form' ? 'primary' : 'neutral'"
					@click="switchMode('form')"
				/>
				<UButton
					:label="t('form.projects.docker.compose.mode.yaml')"
					:variant="editMode === 'yaml' ? 'solid' : 'ghost'"
					:color="editMode === 'yaml' ? 'primary' : 'neutral'"
					@click="switchMode('yaml')"
				/>
			</div>
		</div>
		<ComposeJsonSchema v-if="editMode === 'form'" v-model="model" />
		<UTextarea
			v-else
			:model-value="currentContent()"
			class="w-full font-mono"
			:rows="15"
			@update:model-value="writeContent"
		/>
	</div>
</template>
