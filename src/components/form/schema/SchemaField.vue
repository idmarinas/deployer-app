<script setup lang="ts">
import type { SchemaNode } from 'json-schema-library'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { classifyNode, resolveNode } from '@/utils/schema-form/jsl'
import { WIDGET_KEY } from '@/utils/schema-form/normalize'
import { useSchemaToFormContext } from './context'

const SCALAR_KINDS = new Set(['string', 'number', 'integer', 'boolean', 'enum'])

const props = defineProps<{
	node: SchemaNode
	path: string
	bare?: boolean
	required?: boolean
}>()

const { t } = useI18n()
const form = useSchemaToFormContext()

const node = computed(() => resolveNode(props.node))
const cls = computed(() => classifyNode(node.value))
const schema = computed(() => node.value.schema as Record<string, unknown>)

const isScalar = computed(() => SCALAR_KINDS.has(cls.value.kind))
const isNullable = computed(() => cls.value.nullable)
const isNullValue = computed(() => form.get(props.path) === null)

const widget = computed(() => {
	const name = schema.value[WIDGET_KEY]
	return typeof name === 'string' ? form.widgets[name] : undefined
})

const name = computed(() => {
	const parts = props.path.split('.')
	return pretty(parts[parts.length - 1] ?? '')
})

const title = typeof schema.value.title === 'string' ? schema.value.title : undefined

const label = computed(() => form.resolveTitle(props.path, schema.value) ?? title ?? name.value)
const help = computed(() => form.resolveDescription(props.path, schema.value))
const hint = computed(() => (schema.value.deprecated ? t('common.common.deprecated') : undefined))

const errors = computed(() => form.errorAt(props.path))
const errorText = computed(() => errors.value?.[0])

const warnings = computed(() => form.warningAt(props.path))
const warningText = computed(() => warnings.value?.[0])

const model = computed<any>({
	get: () => form.get(props.path),
	set: (v: unknown) => form.set(props.path, v),
})

const containerClass = computed(() =>
	props.bare
		? 'flex flex-col gap-2'
		: 'flex flex-col gap-2 rounded-lg border border-muted-300 p-3 dark:border-muted-700',
)

const enumSource = computed<unknown[]>(() => {
	if (cls.value.kind !== 'enum') return []
	if (Array.isArray(node.value.enum)) return node.value.enum
	if (schema.value.const !== undefined) return [schema.value.const]
	return []
})
const enumItems = computed<any[]>(() => enumSource.value.map(o => ({ label: String(o), value: o })))

const arrayRef = ref<{ add: () => void }>()
const mapRef = ref<{ add: () => void }>()

function handleAdd() {
	if (cls.value.kind === 'array') arrayRef.value?.add()
	else if (cls.value.kind === 'map') mapRef.value?.add()
}

function removeProperty() {
	form.remove(props.path)
}

function pretty(raw: string): string {
	const out = raw.replace(/[_]+/g, ' ').trim()
	return out ? out.charAt(0).toUpperCase() + out.slice(1) : out
}
</script>

<template>
	<div class="flex flex-col gap-1">
		<div v-if="isNullable" class="flex items-center gap-2">
			<SchemaFieldNull :path="path" :node="node" />
			<span class="text-xs text-muted">{{ t('form.schema_form.null_value') }}</span>
		</div>

		<template v-if="!isNullable || !isNullValue">
			<UFormField
				v-if="isScalar"
				:label="bare ? undefined : label"
				:help="bare ? undefined : help"
				:hint="hint"
				:error="errorText"
				:required="required"
				class="w-full"
			>
				<template v-if="!bare && !required" #label="{ label: slotLabel }">
					<div class="flex w-full items-center justify-between gap-2">
						<span class="min-w-0">{{ slotLabel }}</span>
						<UButton
							icon="i-tabler-x"
							variant="ghost"
							color="neutral"
							size="xs"
							:aria-label="t('form.schema_form.remove_property')"
							:title="t('form.schema_form.remove_property')"
							class="-mr-1 shrink-0"
							@click="removeProperty"
						/>
					</div>
				</template>
				<component v-if="widget" :is="widget" v-model="model" />
				<UInput
					v-else-if="cls.kind === 'string'"
					v-model="model"
					:type="schema.format === 'email' ? 'email' : 'text'"
					class="w-full"
				/>
				<UInputNumber
					v-else-if="cls.kind === 'number' || cls.kind === 'integer'"
					v-model="model"
					:min="node.minimum ?? node.schema.exclusiveMinimum"
					:max="node.maximum ?? node.schema.exclusiveMaximum"
					:step="node.multipleOf"
					class="w-full"
				/>
				<USwitch v-else-if="cls.kind === 'boolean'" v-model="model" />
				<USelect v-else-if="cls.kind === 'enum'" v-model="model" :items="enumItems" class="w-full" />
			</UFormField>

			<div v-else :class="containerClass">
				<template v-if="!bare">
					<div class="flex items-start justify-between gap-2">
						<div class="flex flex-col gap-0.5">
							<p class="text-sm font-medium">
								{{ label }}
								<UBadge v-if="schema.deprecated" size="xs" color="warning" variant="subtle">{{ hint }}</UBadge>
							</p>
							<p v-if="help" class="text-xs text-muted">{{ help }}</p>
						</div>
						<div class="flex items-center gap-1">
							<UButton
								v-if="!required"
								icon="i-tabler-x"
								variant="ghost"
								color="neutral"
								size="xs"
								:aria-label="t('form.schema_form.remove_property')"
								:title="t('form.schema_form.remove_property')"
								class="shrink-0"
								@click="removeProperty"
							/>
							<UButton
								v-if="cls.kind === 'array' || cls.kind === 'map'"
								size="xs"
								variant="outline"
								icon="i-tabler-plus"
								:label="cls.kind === 'array' ? t('form.schema_form.add_item') : t('form.schema_form.add_entry')"
								@click="handleAdd"
							/>
						</div>
					</div>
				</template>

				<SchemaFieldUnion v-if="cls.kind === 'union'" :node="node" :path="path" />
				<SchemaFieldArray v-else-if="cls.kind === 'array'" ref="arrayRef" :node="node" :path="path" :bare="bare" />
				<SchemaFieldMap v-else-if="cls.kind === 'map'" ref="mapRef" :node="node" :path="path" :bare="bare" />
				<SchemaFieldAny v-else-if="cls.kind === 'any'" :node="node" :path="path" />

				<div v-else-if="cls.kind === 'object'">
					<SchemaFieldObject :node="node" :path="path" />
				</div>
			</div>
		</template>

		<p v-if="errorText" class="text-xs text-error">{{ errorText }}</p>
		<p v-if="warningText" class="text-xs text-warning">{{ warningText }}</p>
	</div>
</template>
