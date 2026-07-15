<script lang="ts">
import type { JSONContent } from '@tiptap/vue-3'

import { DESCRIPTION_MAX_LENGTH, serializeDescription } from '@/utils/description'
import { computed, ref, watch } from 'vue'

function parseContent(raw: string | undefined): JSONContent | undefined {
	if (!raw) return undefined
	try {
		return JSON.parse(raw) as JSONContent
	} catch {
		return undefined
	}
}
</script>

<script setup lang="ts">
const modelValue = defineModel<string | undefined>()

const parsedContent = ref<JSONContent | undefined>(parseContent(modelValue.value))

const jsonSize = computed(() => modelValue.value?.length ?? 0)

watch(modelValue, (val) => {
	const parsed = parseContent(val)
	if (JSON.stringify(parsed) !== JSON.stringify(parsedContent.value)) {
		parsedContent.value = parsed
	}
})

function onEditorUpdate(json: JSONContent | undefined) {
	const serialized = serializeDescription(json)
	if (serialized !== modelValue.value) {
		modelValue.value = serialized ?? undefined
	}
}
</script>

<template>
	<Editor :model-value="parsedContent" @update:model-value="onEditorUpdate" :json-size="jsonSize" :json-limit="DESCRIPTION_MAX_LENGTH" />
</template>
