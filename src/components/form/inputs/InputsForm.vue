<script lang="ts">
import type {
	InputDefaultMessageKey,
	InputFieldDefinition,
	InputValueMessageKey,
	InputValues,
} from '@/utils/inputs'

/** Claves i18n válidas para los problemas de un parámetro (default o valor). */
type InputIssueMessageKey = InputDefaultMessageKey | InputValueMessageKey

export interface InputFieldIssue {
	messageKey: InputIssueMessageKey
	messageParams?: Record<string, string | number>
}
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'

const props = withDefaults(
	defineProps<{
		fields: InputFieldDefinition[]
		issues?: Record<string, InputFieldIssue>
		disabled?: boolean
	}>(),
	{
		issues: () => ({}),
		disabled: false,
	},
)

const values = defineModel<InputValues>({ required: true })

const { t } = useI18n()

/** `null`/`undefined` se guardan como cadena vacía; `false` y `0` se conservan. */
function setValue(key: string, value: unknown) {
	if (value === undefined || value === null) {
		values.value = { ...values.value, [key]: '' }

		return
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		values.value = { ...values.value, [key]: value }
	}
}

function textValue(key: string): string {
	const value = values.value[key]

	return value === undefined || typeof value === 'boolean' ? '' : String(value)
}

function numberValue(key: string): number | undefined {
	const value = values.value[key]

	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Devuelve el valor de la opción declarada, no el del estado: así un default
 * numérico guardado como texto casa con la opción y `USelect` lo muestra.
 */
function selectValue(field: InputFieldDefinition): string | number | undefined {
	const value = values.value[field.key]
	if (value === undefined || typeof value === 'boolean') return undefined

	const option = (field.options ?? []).find(item => String(item.value) === String(value))

	return option ? option.value : value
}

/**
 * `USelect` reserva la cadena vacía para limpiar la selección y rechaza los
 * items con ese valor; se descartan para que una definición a medio editar no
 * rompa el diálogo.
 */
function selectItems(field: InputFieldDefinition) {
	return (field.options ?? [])
		.filter(option => String(option.value) !== '')
		.map(option => ({
			label: option.label || String(option.value),
			value: option.value,
		}))
}

/** Mensaje traducido del problema del campo, o cadena vacía si no tiene. */
function issueMessage(key: string): string {
	const issue = props.issues?.[key]

	return issue ? t(issue.messageKey, issue.messageParams ?? {}) : ''
}
</script>

<template>
	<div class="flex flex-col gap-3">
		<UFormField
			v-for="field in props.fields"
			:key="field.key"
			:label="field.label || field.key"
			:help="field.help"
			:required="field.required"
			:error="Boolean(props.issues?.[field.key])"
		>
			<UInput
				v-if="field.type === 'text'"
				:model-value="textValue(field.key)"
				:disabled="props.disabled"
				class="w-full"
				@update:model-value="value => setValue(field.key, value)"
			/>
			<UInputNumber
				v-else-if="field.type === 'number'"
				:model-value="numberValue(field.key)"
				:disabled="props.disabled"
				:disable-wheel-change="true"
				class="w-full"
				@update:model-value="value => setValue(field.key, value)"
			/>
			<USwitch
				v-else-if="field.type === 'boolean'"
				:model-value="values[field.key] === true"
				:disabled="props.disabled"
				@update:model-value="value => setValue(field.key, value)"
			/>
			<USelect
				v-else-if="field.type === 'select'"
				:model-value="selectValue(field)"
				:items="selectItems(field)"
				value-key="value"
				:disabled="props.disabled"
				class="w-full"
				@update:model-value="value => setValue(field.key, value)"
			/>

			<p v-if="issueMessage(field.key)" class="mt-1 flex items-start gap-1.5 text-xs text-error">
				<UIcon :name="ICONS.status.alertCircle" class="mt-0.5 size-4 shrink-0" />
				<span>{{ issueMessage(field.key) }}</span>
			</p>
		</UFormField>
	</div>
</template>
