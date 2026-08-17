<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { getImageMimeType, isImageEntry, type ManagedFile } from '@/lib/files'
</script>

<script setup lang="ts">
const props = defineProps<{
	entry: ManagedFile
	readonly?: boolean
}>()

const model = defineModel<string>({ required: true })

const { t } = useI18n()

const isImage = computed(() => isImageEntry(props.entry))

const imageSrc = computed(() => {
	if (!isImage.value || !props.entry.content) return ''
	const mime = getImageMimeType(props.entry)
	return `data:${mime ?? 'image/png'};base64,${props.entry.content}`
})
</script>

<template>
	<img
		v-if="isImage && imageSrc"
		:src="imageSrc"
		:alt="entry.file_path"
		class="max-h-96 w-full object-contain rounded-lg border border-muted"
	/>
	<UAlert
		v-else-if="entry.is_binary"
		icon="i-vscode-icons-file-type-binary"
		color="warning"
		variant="soft"
		:description="t('form.files.binary_hint')"
	/>
	<UTextarea
		v-else
		v-model="model"
		class="w-full font-mono"
		:rows="15"
		:placeholder="t('form.files.text_content')"
		:readonly="props.readonly"
	/>
</template>
