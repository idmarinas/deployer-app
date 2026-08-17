<script setup lang="ts">
import type { SchemaNode } from 'json-schema-library'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
	activeVariantIndex,
	classifyNode,
	preferredVariant,
	resolveNode,
	variantDefault,
	variantLabel,
} from '@/utils/schema-form/jsl'
import { useSchemaFormContext } from './context'

const props = defineProps<{ node: SchemaNode; path: string; bare?: boolean }>()

const { t } = useI18n()
const form = useSchemaFormContext()

const itemNode = computed(() => (props.node.items ? resolveNode(props.node.items) : undefined))
const itemClass = computed(() => (itemNode.value ? classifyNode(itemNode.value) : undefined))
const variants = computed(() => (itemClass.value?.isUnion ? (itemClass.value.variants ?? []) : []))
const hasFormatSelect = computed(() => variants.value.length > 0)

const items = computed<any[]>(() => {
	const v = form.get(props.path)
	return Array.isArray(v) ? v : []
})

const selectedFormat = ref<string | undefined>(undefined)

watch(
	[items, hasFormatSelect],
	() => {
		if (!hasFormatSelect.value || selectedFormat.value !== undefined) return
		const first = items.value[0]
		if (first !== undefined && itemNode.value) {
			const idx = activeVariantIndex(itemNode.value, first, '')
			if (idx !== undefined && idx < variants.value.length) {
				selectedFormat.value = String(idx)
				return
			}
		}
		const pref = itemNode.value ? preferredVariant(itemNode.value) : undefined
		if (pref) {
			const idx = variants.value.indexOf(pref)
			if (idx >= 0) selectedFormat.value = String(idx)
		}
	},
	{ immediate: true },
)

const activeNode = computed<SchemaNode | undefined>(() => {
	if (!itemNode.value) return undefined
	if (!hasFormatSelect.value) return itemNode.value
	const idx = selectedFormat.value === undefined ? undefined : Number(selectedFormat.value)
	const variant = idx !== undefined ? variants.value[idx] : undefined
	return variant ? resolveNode(variant) : undefined
})

const formatOptions = computed(() =>
	variants.value.map((v, i) => ({ label: kindLabel(resolveNode(v)), value: String(i) })),
)

function kindLabel(node: SchemaNode): string {
	const key = `form.schema_form.kind.${classifyNode(node).kind}`
	const label = t(key, {}, { missingWarn: false, fallbackWarn: false })
	return label === key ? variantLabel(node) : label
}

function addItem() {
	if (!activeNode.value) return
	form.set(props.path, [...items.value, variantDefault(activeNode.value)])
}

function removeItem(index: number) {
	form.remove(`${props.path}[${index}]`)
}

defineExpose({ add: addItem })
</script>

<template>
	<div class="flex flex-col gap-2">
		<URadioGroup
			v-if="hasFormatSelect"
			:items="formatOptions"
			:model-value="selectedFormat"
			orientation="horizontal"
			variant="table"
			indicator="hidden"
			size="xs"
			@update:model-value="(v: string | undefined) => (selectedFormat = v)"
		/>

		<p v-if="items.length === 0" class="text-xs italic text-muted">{{ t('form.schema_form.empty_array') }}</p>

		<div v-for="(_, index) in items" :key="index" class="flex items-start gap-2">
			<div class="min-w-0 flex-1">
				<SchemaField v-if="activeNode" :node="activeNode" :path="`${path}[${index}]`" bare />
			</div>
			<UButton icon="i-tabler-trash" color="error" variant="ghost" size="xs" @click="removeItem(index)" />
		</div>

		<div v-if="bare">
			<UButton icon="i-tabler-plus" variant="outline" size="xs" @click="addItem">
				{{ t('form.schema_form.add_item') }}
			</UButton>
		</div>
	</div>
</template>
