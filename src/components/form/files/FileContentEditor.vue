<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { getImageMimeType, isImageEntry, type ManagedFile } from '@/lib/files'
</script>

<script setup lang="ts">
const model = defineModel<ManagedFile>({ required: true })

const props = withDefaults(
	defineProps<{
		readonly?: boolean
	}>(),
	{
		readonly: false,
	},
)

const { t } = useI18n()

const isImage = computed(() => isImageEntry(model.value))

const imageSrc = computed(() => {
	if (!isImage.value || !model.value.content) return ''

	const mime = getImageMimeType(model.value)

	return `data:${mime ?? 'image/png'};base64,${model.value.content}`
})
</script>

<template>
	<img
		v-if="isImage && imageSrc"
		:src="imageSrc"
		:alt="model.file_path"
		class="max-h-96 w-full object-contain rounded-lg border border-muted"
	/>
	<UAlert
		v-else-if="model.is_binary"
		icon="i-vscode-icons-file-type-binary"
		color="warning"
		variant="soft"
		:description="t('form.files.binary_hint')"
	/>
	<UTextarea
		v-else
		v-model="model.content"
		class="w-full font-mono"
		:rows="15"
		:placeholder="t('form.files.text_content')"
		:readonly="readonly"
	/>
</template>
