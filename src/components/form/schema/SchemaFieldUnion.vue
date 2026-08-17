<script setup lang="ts">
import type { SchemaNode } from 'json-schema-library'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
	activeVariantIndex,
	classifyNode,
	preferredVariant,
	resolveNode,
	variantDefault,
	variantLabel,
} from '@/utils/schema-form/jsl'
import { useSchemaToFormContext } from './context'

const props = defineProps<{ node: SchemaNode; path: string }>()

const { t } = useI18n()
const form = useSchemaToFormContext()

const variants = computed(() => classifyNode(props.node).variants ?? [])
const resolved = computed(() => variants.value.map(v => resolveNode(v)))

const options = computed(() =>
	variants.value.map((_v, i) => ({ label: kindLabel(resolved.value[i]), value: String(i) })),
)

function kindLabel(node: SchemaNode): string {
	const key = `form.schema_form.kind.${classifyNode(node).kind}`
	const label = t(key, {}, { missingWarn: false, fallbackWarn: false })
	return label === key ? variantLabel(node) : label
}

const activeIndex = computed<number | undefined>(() => {
	const idx = activeVariantIndex(props.node, form.formData.value, props.path)
	if (idx !== undefined && idx < variants.value.length) return idx
	const pref = preferredVariant(props.node)
	if (pref) {
		const idx = variants.value.indexOf(pref)
		if (idx >= 0) return idx
	}
	return undefined
})

function onSelect(value?: string) {
	if (value === undefined) return
	const index = Number(value)
	const variant = variants.value[index]
	if (!variant) return
	const defaultValue = variantDefault(variant)
	if (defaultValue === undefined) form.remove(props.path)
	else form.set(props.path, defaultValue)
}
</script>

<template>
	<div class="flex flex-col gap-2">
		<URadioGroup
			:items="options"
			:model-value="activeIndex === undefined ? undefined : String(activeIndex)"
			orientation="horizontal"
			variant="table"
			indicator="hidden"
			size="xs"
			@update:model-value="onSelect"
		/>

		<SchemaField v-if="activeIndex !== undefined" :node="resolved[activeIndex]" :path="path" bare />
	</div>
</template>
