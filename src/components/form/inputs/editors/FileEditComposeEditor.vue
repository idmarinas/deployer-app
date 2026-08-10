<script lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ComposeFile, ComposeMode } from '@/lib/docker-compose/types'
import { parseComposeYaml, serializeComposeYaml } from '@/lib/docker-compose/parser'
import ComposeFileForm from './parts/ComposeFileForm.vue'
</script>

<script setup lang="ts">
const { t } = useI18n()

const model = defineModel<string | null>({ required: true })

const editMode = ref<ComposeMode>('form')

const composeFile = ref<ComposeFile>({ services: {} })

let lastEmittedContent: string | null = null

function currentContent(): string {
	return model.value ?? ''
}

function writeContent(content: string) {
	lastEmittedContent = content
	model.value = content
}

function initComposeFile() {
	composeFile.value = parseComposeYaml(currentContent())
}

function switchMode(mode: ComposeMode) {
	if (mode === editMode.value) return
	if (mode === 'form') {
		initComposeFile()
	} else {
		writeContent(serializeComposeYaml(composeFile.value))
	}
	editMode.value = mode
}

watch(
	composeFile,
	() => {
		if (editMode.value === 'form') {
			writeContent(serializeComposeYaml(composeFile.value))
		}
	},
	{ deep: true },
)

watch(
	model,
	value => {
		const content = value ?? ''
		if (content === lastEmittedContent) return
		if (editMode.value === 'form') {
			initComposeFile()
		}
	},
)

initComposeFile()
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-end gap-3">
			<UBadge variant="subtle" color="secondary">{{ t('form.docker_composes.mode.label') }}</UBadge>
			<div class="flex gap-1 p-1 bg-muted rounded-lg w-fit">
				<UButton
					:label="t('form.docker_composes.mode.form')"
					:variant="editMode === 'form' ? 'solid' : 'ghost'"
					:color="editMode === 'form' ? 'primary' : 'neutral'"
					@click="switchMode('form')"
				/>
				<UButton
					:label="t('form.docker_composes.mode.yaml')"
					:variant="editMode === 'yaml' ? 'solid' : 'ghost'"
					:color="editMode === 'yaml' ? 'primary' : 'neutral'"
					@click="switchMode('yaml')"
				/>
			</div>
		</div>
		<ComposeFileForm v-if="editMode === 'form'" v-model="composeFile" />
		<UTextarea v-else :model-value="currentContent()" class="w-full font-mono" :rows="15" @update:model-value="writeContent" />
	</div>
</template>
