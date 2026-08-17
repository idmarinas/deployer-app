<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SchemaNode } from 'json-schema-library'

import { useSchemaFormContext } from './context'

const props = defineProps<{ node: SchemaNode; path: string }>()

const { t } = useI18n()
const form = useSchemaFormContext()

const jsonText = ref('')
const jsonError = ref(false)
watch(
	() => form.get(props.path),
	(v) => {
		jsonText.value = JSON.stringify(v ?? {}, null, 2)
	},
	{ immediate: true },
)

function commitJson() {
	try {
		form.set(props.path, JSON.parse(jsonText.value))
		jsonError.value = false
	} catch {
		jsonError.value = true
	}
}
</script>

<template>
	<div class="flex flex-col gap-1">
		<UTextarea
			:model-value="jsonText"
			:rows="4"
			class="w-full font-mono"
			:color="jsonError ? 'error' : 'neutral'"
			@update:model-value="(v: string) => (jsonText = v)"
			@blur="commitJson"
		/>
		<p v-if="jsonError" class="text-xs text-error">{{ t('form.schema_form.json_invalid') }}</p>
	</div>
</template>
