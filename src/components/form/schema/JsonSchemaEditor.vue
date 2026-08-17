<script setup lang="ts">
import type { JsonSchema, SchemaNode } from 'json-schema-library'
import type { Component } from 'vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSchemaToForm } from '@/composables/useSchemaToForm'
import useToaster from '@/composables/useToaster'
import type { MessageResolver } from '@/utils/schema-form/validate'
import { parseYaml, toYaml } from '@/utils/yaml-utils'
import { provideSchemaFormContext } from './context'

const props = withDefaults(
	defineProps<{
		schema: JsonSchema
		title?: string
		description?: string
		formatOutput?: 'yaml' | 'json'
		importLabel?: string
		resolveTitle?: (path: string, schema: Record<string, unknown>) => string | undefined
		resolveDescription?: (path: string, schema: Record<string, unknown>) => string | undefined
		resolveMessage?: MessageResolver
		icon?: (name: string, node: SchemaNode) => string | undefined
		widgets?: Record<string, Component>
	}>(),
	{
		formatOutput: 'yaml',
		importLabel: undefined,
		resolveTitle: undefined,
		resolveDescription: undefined,
		resolveMessage: undefined,
		icon: undefined,
		widgets: undefined,
	},
)

const model = defineModel<string | null>()

const { t } = useI18n()

const importAccept = computed(() => (props.formatOutput === 'json' ? '.json' : '.yaml,.yml'))

function parseDocument(text: string): unknown {
	return props.formatOutput === 'json' ? JSON.parse(text) : parseYaml(text)
}

function serializeDocument(data: unknown): string {
	return props.formatOutput === 'json' ? (JSON.stringify(data, null, 2) ?? '') : toYaml(data)
}

const form = useSchemaToForm(props.schema, {
	resolveTitle: props.resolveTitle,
	resolveDescription: props.resolveDescription,
	resolveMessage: props.resolveMessage,
	widgets: props.widgets,
})
provideSchemaFormContext(form)

const formData = computed(() => form.formData.value)

let lastModel: string | null | undefined = undefined
let syncingFromModel = false

watch(
	model,
	value => {
		const content = value ?? ''
		if (content === lastModel) return
		lastModel = content

		let data: unknown
		try {
			data = parseDocument(content)
		} catch {
			return
		}

		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			data = {}
		}

		syncingFromModel = true
		form.setData(data as Record<string, any>)
		nextTick(() => {
			syncingFromModel = false
		})
	},
	{ immediate: true },
)

watch(
	formData,
	() => {
		const shouldWrite = !syncingFromModel
		form.validate()
		if (!shouldWrite) return

		let out: string
		try {
			out = serializeDocument(formData.value)
		} catch {
			return
		}

		if (out === (model.value ?? '')) return
		lastModel = out
		model.value = out
	},
	{ deep: true },
)

const preview = computed(() => {
	try {
		return serializeDocument(formData.value)
	} catch (error) {
		return String(error)
	}
})

const errorsMap = computed(() => form.errors.value ?? {})
const errorEntries = computed(() => Object.entries(errorsMap.value))
const errorPathCount = computed(() => errorEntries.value.length)
const hasErrors = computed(() => errorPathCount.value > 0)
const errorSummary = computed(() =>
	errorEntries.value
		.slice(0, 3)
		.map(([path, messages]) => `${path}: ${messages[0]}`)
		.join(' · '),
)

const warningsMap = computed(() => form.warnings.value ?? {})
const warningEntries = computed(() => Object.entries(warningsMap.value))
const warningPathCount = computed(() => warningEntries.value.length)
const hasWarnings = computed(() => warningPathCount.value > 0)
const warningSummary = computed(() =>
	warningEntries.value
		.slice(0, 3)
		.map(([path, messages]) => `${path}: ${messages[0]}`)
		.join(' · '),
)

const importLabel = computed(() => props.importLabel ?? t('form.schema_form.import_file'))

const fileInputRef = ref<HTMLInputElement>()
const toaster = useToaster()

function importDocument() {
	fileInputRef.value?.click()
}

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ''))
		reader.onerror = () => reject(reader.error)
		reader.readAsText(file)
	})
}

async function handleImport(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return

	const text = await readFileAsText(file)

	let data: unknown
	try {
		data = parseDocument(text)
	} catch (error) {
		toaster.error(t('form.schema_form.import_failed'), String(error instanceof Error ? error.message : error))
		return
	}

	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		toaster.error(t('form.schema_form.import_failed'), t('form.schema_form.import_not_object'))
		return
	}

	form.setData(data as Record<string, any>)
	toaster.success(t('form.schema_form.imported'))
}
</script>

<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div v-if="title || description" class="flex flex-col gap-0.5">
				<h2 v-if="title" class="text-base font-semibold">{{ title }}</h2>
				<p v-if="description" class="text-xs text-muted">{{ description }}</p>
			</div>
			<div class="flex items-center gap-2">
				<UBadge size="xs" color="neutral" variant="subtle">{{ form.draft }}</UBadge>
				<UButton size="sm" icon="i-tabler-upload" variant="outline" :label="importLabel" @click="importDocument" />
				<input ref="fileInputRef" type="file" :accept="importAccept" class="hidden" @change="handleImport" />
			</div>
		</div>

		<UAlert
			v-if="hasErrors"
			color="error"
			variant="subtle"
			icon="i-tabler-alert-triangle"
			:title="t('form.schema_form.validation_errors', { count: errorPathCount })"
			:description="errorSummary"
		/>

		<UAlert
			v-if="hasWarnings"
			color="warning"
			variant="subtle"
			icon="i-tabler-alert-triangle"
			:title="t('form.schema_form.validation_warnings', { count: warningPathCount })"
			:description="warningSummary"
		/>

		<SchemaFieldObject :node="form.root" path="" :icon="icon" />

		<UCard v-if="preview.trim()" title="Preview">
			<pre
				class="max-h-96 overflow-auto rounded-md bg-muted-100 p-3 font-mono text-xs whitespace-pre-wrap dark:bg-muted-900"
				>{{ preview }}</pre>
		</UCard>
	</div>
</template>
