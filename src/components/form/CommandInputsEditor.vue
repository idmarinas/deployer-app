<script lang="ts">
import type { GlobalVariableScope } from '@/drizzle/lib/variables'
import type { InputFieldDefinition, InputFieldType } from '@/utils/inputs'

/** Previsualización del valor resuelto de un `default` con variables globales. */
type DefaultPreview = { value: string; error?: undefined } | { value?: undefined; error: string }
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
import { MAX_INPUT_FIELDS, resolveInputDefaults } from '@/utils/inputs'

const inputs = defineModel<InputFieldDefinition[]>({ required: true })

const props = withDefaults(
	defineProps<{
		globalScope?: GlobalVariableScope
		scopeLoaded?: boolean
	}>(),
	{
		globalScope: () => ({}),
		scopeLoaded: true,
	},
)

const { t } = useI18n()

const typeOptions = computed<Array<{ label: string; value: InputFieldType }>>(() => [
	{ label: t('form.commands.inputs.type.text'), value: 'text' },
	{ label: t('form.commands.inputs.type.number'), value: 'number' },
	{ label: t('form.commands.inputs.type.boolean'), value: 'boolean' },
	{ label: t('form.commands.inputs.type.select'), value: 'select' },
])

const canAdd = computed(() => inputs.value.length < MAX_INPUT_FIELDS)

function addInput() {
	if (!canAdd.value) return

	inputs.value = [...inputs.value, { key: '', label: '', type: 'text', required: false }]
}

function removeInput(index: number) {
	inputs.value = inputs.value.filter((_, itemIndex) => itemIndex !== index)
}

function moveInput(index: number, offset: number) {
	const target = index + offset
	if (target < 0 || target >= inputs.value.length) return

	const next = [...inputs.value]
	const [item] = next.splice(index, 1)
	if (!item) return

	next.splice(target, 0, item)
	inputs.value = next
}

/**
 * Ajusta el campo al cambiar de tipo: `select` necesita opciones y `boolean`
 * solo admite un default literal booleano.
 */
function changeType(field: InputFieldDefinition, type: InputFieldType) {
	if (field.type === type) return

	field.type = type

	if (type === 'select') {
		if (!field.options || field.options.length === 0) {
			field.options = [{ label: '', value: '' }]
		}
	} else {
		delete field.options
	}

	if (type === 'boolean') {
		if (field.default !== undefined && typeof field.default !== 'boolean') {
			field.default = false
		}

		return
	}

	if (typeof field.default === 'boolean') {
		delete field.default
	}
}

function updateType(field: InputFieldDefinition, value: unknown) {
	if (value === 'text' || value === 'number' || value === 'boolean' || value === 'select') {
		changeType(field, value)
	}
}

function addOption(field: InputFieldDefinition) {
	field.options = [...(field.options ?? []), { label: '', value: '' }]
}

function removeOption(field: InputFieldDefinition, index: number) {
	field.options = (field.options ?? []).filter((_, itemIndex) => itemIndex !== index)
}

function stringDefault(field: InputFieldDefinition): string {
	const value = field.default

	return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** Guarda el default como texto; vacío equivale a no tener default. */
function updateStringDefault(field: InputFieldDefinition, value: string | number | undefined) {
	const text = value === undefined || value === null ? '' : String(value)

	if (text === '') {
		delete field.default
	} else {
		field.default = text
	}
}

/**
 * Opciones que pueden ofrecerse como valor por defecto. Reka UI rechaza los
 * items con valor vacío (reserva la cadena vacía para limpiar la selección),
 * así que se filtran mientras la opción aún no tiene valor.
 */
function selectItems(field: InputFieldDefinition): Array<{ label: string; value: string }> {
	return (field.options ?? [])
		.filter(option => String(option.value) !== '')
		.map(option => ({
			label: option.label || String(option.value),
			value: String(option.value),
		}))
}

function selectDefault(field: InputFieldDefinition): string | undefined {
	const value = field.default

	return typeof value === 'boolean' || value === undefined ? undefined : String(value)
}

function updateSelectDefault(field: InputFieldDefinition, value: unknown) {
	if (value === undefined || value === null || value === '') {
		delete field.default

		return
	}

	field.default = String(value)
}

function updateBooleanDefault(field: InputFieldDefinition, value: boolean) {
	field.default = value
}

/** Expresión que usará el script para este parámetro. */
function paramExpression(field: InputFieldDefinition): string {
	return `{{params.${field.key}}}`
}

/**
 * Valor que tendrá el default con las variables globales actuales. Solo se
 * previsualizan las expresiones (`{{global.slug}}`); los literales no cambian.
 */
function resolvePreview(field: InputFieldDefinition): DefaultPreview | null {
	if (!props.scopeLoaded) return null
	if (typeof field.default !== 'string' || !field.default.includes('{{')) return null

	const { values, issues } = resolveInputDefaults([field], props.globalScope)
	const issue = issues[0]

	if (issue) {
		return { error: t(issue.messageKey, issue.messageParams) }
	}

	const resolved = values[field.key]

	return { value: resolved === undefined ? '' : String(resolved) }
}

const defaultPreviews = computed(() => inputs.value.map(field => resolvePreview(field)))
</script>

<template>
	<div class="flex w-full flex-col gap-3">
		<div v-if="inputs.length === 0" class="rounded-lg border border-dashed border-default p-4 text-center">
			<p class="text-sm text-muted">{{ t('form.commands.inputs.empty') }}</p>
		</div>

		<div
			v-for="(field, index) in inputs"
			:key="index"
			class="flex flex-col gap-2 rounded-md border border-default/70 p-2"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="text-xs text-muted">
					{{ t('form.commands.inputs.parameter') }} #{{ index + 1 }}
					<span v-if="field.key" class="font-mono text-dimmed">· {{ paramExpression(field) }}</span>
				</p>
				<div class="flex items-center gap-1">
					<UButton
						size="xs"
						variant="ghost"
						color="neutral"
						:icon="ICONS.actions.moveUp"
						:aria-label="t('form.commands.inputs.actions.move_up')"
						:title="t('form.commands.inputs.actions.move_up')"
						:disabled="index === 0"
						@click="moveInput(index, -1)"
					/>
					<UButton
						size="xs"
						variant="ghost"
						color="neutral"
						:icon="ICONS.actions.moveDown"
						:aria-label="t('form.commands.inputs.actions.move_down')"
						:title="t('form.commands.inputs.actions.move_down')"
						:disabled="index === inputs.length - 1"
						@click="moveInput(index, 1)"
					/>
					<UButton
						size="xs"
						variant="ghost"
						color="error"
						:icon="ICONS.actions.delete"
						:aria-label="t('form.commands.inputs.actions.remove')"
						:title="t('form.commands.inputs.actions.remove')"
						@click="removeInput(index)"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-2 md:grid-cols-12">
				<UFormField :label="t('form.commands.inputs.key.label')" :help="t('form.commands.inputs.key.help')" class="md:col-span-3">
					<UInput
						v-model="field.key"
						class="w-full font-mono"
						:placeholder="t('form.commands.inputs.key.placeholder')"
					/>
				</UFormField>
				<UFormField :label="t('form.commands.inputs.label.label')" class="md:col-span-4">
					<UInput
						v-model="field.label"
						class="w-full"
						:placeholder="t('form.commands.inputs.label.placeholder')"
					/>
				</UFormField>
				<UFormField :label="t('form.commands.inputs.type.label')" class="md:col-span-3">
					<USelect
						:model-value="field.type"
						:items="typeOptions"
						value-key="value"
						class="w-full"
						@update:model-value="value => updateType(field, value)"
					/>
				</UFormField>
				<UFormField :label="t('form.commands.inputs.required.label')" :help="t('form.commands.inputs.required.help')" class="md:col-span-2">
					<USwitch v-model="field.required" />
				</UFormField>
			</div>

			<div class="grid grid-cols-1 gap-2 md:grid-cols-12">
				<UFormField :label="t('form.commands.inputs.field_help.label')" class="md:col-span-4">
					<UInput
						v-model="field.help"
						class="w-full"
						:placeholder="t('form.commands.inputs.field_help.placeholder')"
					/>
				</UFormField>

				<UFormField
					:label="t('form.commands.inputs.default.label')"
					:help="t('form.commands.inputs.default.help')"
					class="md:col-span-8"
				>
					<USwitch
						v-if="field.type === 'boolean'"
						:model-value="field.default === true"
						@update:model-value="value => updateBooleanDefault(field, value)"
					/>
					<USelect
						v-else-if="field.type === 'select'"
						:model-value="selectDefault(field)"
						:items="selectItems(field)"
						value-key="value"
						:placeholder="t('form.commands.inputs.default.placeholder')"
						class="w-full"
						@update:model-value="value => updateSelectDefault(field, value)"
					/>
					<UInput
						v-else
						:model-value="stringDefault(field)"
						class="w-full font-mono"
						:placeholder="t('form.commands.inputs.default.placeholder')"
						@update:model-value="value => updateStringDefault(field, value)"
					/>
				</UFormField>
			</div>

			<template v-if="defaultPreviews[index]">
				<p v-if="defaultPreviews[index]?.error" class="flex items-start gap-1.5 text-xs text-error">
					<UIcon :name="ICONS.status.alertCircle" class="mt-0.5 size-4 shrink-0" />
					<span>{{ defaultPreviews[index]?.error }}</span>
				</p>
				<p v-else class="text-xs text-muted">
					{{ t('form.commands.inputs.default.resolved') }}
					<code class="rounded-sm bg-accented px-1 font-mono text-highlighted">{{ defaultPreviews[index]?.value }}</code>
				</p>
			</template>

			<div v-if="field.type === 'select'" class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<p class="text-xs font-medium">{{ t('form.commands.inputs.options.title') }}</p>
					<UButton size="xs" variant="soft" :icon="ICONS.actions.add" @click="addOption(field)">
						{{ t('form.commands.inputs.options.add') }}
					</UButton>
				</div>

				<p v-if="!field.options || field.options.length === 0" class="text-xs text-muted">
					{{ t('form.commands.inputs.options.empty') }}
				</p>

				<div
					v-for="(option, optionIndex) in field.options"
					:key="optionIndex"
					class="grid grid-cols-1 items-end gap-2 md:grid-cols-12"
				>
					<UFormField :label="t('form.commands.inputs.options.label')" class="md:col-span-5">
						<UInput v-model="option.label" class="w-full" />
					</UFormField>
					<UFormField :label="t('form.commands.inputs.options.value')" class="md:col-span-5">
						<UInput
							:model-value="String(option.value)"
							class="w-full font-mono"
							@update:model-value="value => (option.value = value)"
						/>
					</UFormField>
					<div class="md:col-span-2">
						<UButton
							size="xs"
							variant="ghost"
							color="error"
							:icon="ICONS.actions.delete"
							:aria-label="t('form.commands.inputs.options.remove')"
							:title="t('form.commands.inputs.options.remove')"
							@click="removeOption(field, optionIndex)"
						/>
					</div>
				</div>
			</div>
		</div>

		<div>
			<UButton size="xs" variant="soft" :icon="ICONS.actions.add" :disabled="!canAdd" @click="addInput">
				{{ t('form.commands.inputs.add') }}
			</UButton>
		</div>
	</div>
</template>
