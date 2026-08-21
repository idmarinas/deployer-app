<script lang="ts">
import type { JSONContent } from '@tiptap/vue-3'

import { DESCRIPTION_MAX_LENGTH } from '@/utils/description'
import { computed } from 'vue'

function toJsonSize(val: string | JSONContent | undefined): number {
	if (!val) return 0
	if (typeof val === 'string') return val.length
	return JSON.stringify(val).length
}
</script>

<script setup lang="ts">
const modelValue = defineModel<JSONContent | undefined>()
const jsonSize = computed(() => toJsonSize(modelValue.value))
</script>

<template>
	<EditorTextarea v-model="modelValue" :json-size="jsonSize" :json-limit="DESCRIPTION_MAX_LENGTH" />
</template>
