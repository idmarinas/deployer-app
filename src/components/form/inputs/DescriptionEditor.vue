<script lang="ts">
import type { JSONContent } from '@tiptap/vue-3'

import { DESCRIPTION_MAX_LENGTH, serializeDescription } from '@/utils/description'
import { computed, ref, watch } from 'vue'

function parseContent(raw: string | JSONContent | undefined): JSONContent | undefined {
	if (!raw) return undefined
	if (typeof raw === 'object') return raw
	try {
		return JSON.parse(raw) as JSONContent
	} catch {
		return undefined
	}
}

function toJsonSize(val: string | JSONContent | undefined): number {
	if (!val) return 0
	if (typeof val === 'string') return val.length
	return JSON.stringify(val).length
}
</script>

<script setup lang="ts">
const modelValue = defineModel<string | JSONContent | undefined>()

const parsedContent = ref<JSONContent | undefined>(parseContent(modelValue.value))

const jsonSize = computed(() => toJsonSize(modelValue.value))

watch(modelValue, (val) => {
	const parsed = parseContent(val)
	if (JSON.stringify(parsed) !== JSON.stringify(parsedContent.value)) {
		parsedContent.value = parsed
	}
})

function onEditorUpdate(json: JSONContent | undefined) {
	const serialized = serializeDescription(json)
	if (serialized !== (typeof modelValue.value === 'string' ? modelValue.value : undefined)) {
		modelValue.value = serialized ?? undefined
	}
}
</script>

<template>
	<Editor :model-value="parsedContent" @update:model-value="onEditorUpdate" :json-size="jsonSize" :json-limit="DESCRIPTION_MAX_LENGTH" />
</template>
