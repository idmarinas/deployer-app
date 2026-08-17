<script setup lang="ts">
import type { JsonSchema, SchemaNode } from 'json-schema-library'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { classifyNode, compileRoot, resolveNode, variantDefault } from '@/utils/schema-form/jsl'
import { useSchemaToFormContext } from './context'

const ANY_NODE = compileRoot({}).root

const props = defineProps<{ node: SchemaNode; path: string; bare?: boolean }>()

const { t } = useI18n()
const form = useSchemaToFormContext()

const entries = computed<Record<string, unknown>>(() => {
	const v = form.get(props.path)
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
})
const keys = computed(() => Object.keys(entries.value))

const patternHint = computed(() => {
	const first = props.node.patternProperties?.[0]
	return first ? String(first.pattern) : undefined
})

const valueNode = computed<SchemaNode>(() => {
	const patternNode = props.node.patternProperties?.[0]?.node
	if (patternNode) return resolveNode(patternNode)
	const raw = (props.node.schema as Record<string, unknown>).additionalProperties
	if (raw && typeof raw === 'object') return resolveNode(props.node.compileSchema(raw as JsonSchema))
	return ANY_NODE
})

const valueClass = computed(() => classifyNode(valueNode.value))
const showTabs = computed(() => valueClass.value.kind === 'object' && keys.value.length > 0)

const activeEntry = ref(0)

function addEntry() {
	const base = `new_${Object.keys(entries.value).length + 1}`
	let name = base
	let i = 2
	while (name in entries.value) name = `${base}_${i++}`
	form.set(props.path, { ...entries.value, [name]: variantDefault(valueNode.value) })
	activeEntry.value = keys.value.length - 1
}

function renameEntry(oldKey: string, newKey: string) {
	const key = newKey.trim()
	if (!key || key === oldKey || key in entries.value) return
	const copy = { ...entries.value }
	copy[key] = copy[oldKey]
	delete copy[oldKey]
	form.set(props.path, copy)
}

function removeEntry(key: string) {
	const idx = keys.value.indexOf(key)
	const copy = { ...entries.value }
	delete copy[key]
	form.set(props.path, copy)
	const len = keys.value.length
	if (activeEntry.value >= len) activeEntry.value = Math.max(0, len - 1)
	else if (idx >= 0 && activeEntry.value > idx) activeEntry.value -= 1
}

defineExpose({ add: addEntry })
</script>

<template>
	<div class="flex flex-col gap-2">
		<p v-if="patternHint" class="text-xs text-muted">
			{{ t('form.schema_form.key_pattern', { pattern: patternHint }) }}
		</p>
		<p v-if="keys.length === 0" class="text-xs italic text-muted">{{ t('form.schema_form.empty_object') }}</p>

		<div v-if="showTabs" class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-1">
				<UButton
					v-for="(key, index) in keys"
					:key="key"
					size="sm"
					:variant="index === activeEntry ? 'solid' : 'ghost'"
					color="neutral"
					@click="activeEntry = index"
				>
					<span class="max-w-40 truncate font-mono text-xs">{{ key }}</span>
				</UButton>
			</div>

			<div v-if="keys[activeEntry]" class="flex flex-col gap-2 rounded-lg border border-dashed p-2">
				<div class="flex items-center gap-2">
					<UInput
						:model-value="keys[activeEntry]"
						class="w-40 shrink-0 font-mono"
						@update:model-value="(v: string) => renameEntry(keys[activeEntry], v)"
					/>
					<UButton
						icon="i-tabler-trash"
						color="error"
						variant="ghost"
						size="xs"
						@click="removeEntry(keys[activeEntry])"
					/>
				</div>
				<SchemaField :node="valueNode" :path="`${path}.${keys[activeEntry]}`" bare />
			</div>
		</div>

		<template v-else>
			<div v-for="(key, index) in keys" :key="index" class="flex items-start gap-2">
				<UInput
					:model-value="key"
					class="w-40 shrink-0 font-mono"
					@update:model-value="(v: string) => renameEntry(key, v)"
				/>
				<div class="min-w-0 flex-1">
					<SchemaField :node="valueNode" :path="`${path}.${key}`" bare />
				</div>
				<UButton icon="i-tabler-trash" color="error" variant="ghost" size="xs" @click="removeEntry(key)" />
			</div>
		</template>

		<div v-if="bare">
			<UButton icon="i-tabler-plus" variant="outline" size="xs" @click="addEntry">
				{{ t('form.schema_form.add_entry') }}
			</UButton>
		</div>
	</div>
</template>
