<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { JsonSchema } from 'json-schema-library'

import ComposeImagePicker from '@/components/form/inputs/docker-compose/ComposeImagePicker.vue'
import composeSpec from '@/schemas/compose-spec.json'
import { ICONS } from '@/utils/icons'
import { booleanStringNormalizer, normalizeSchema, widgetsNormalizer } from '@/utils/schema-form/normalize'

const model = defineModel<string | null>()

const { t } = useI18n()

function tOrUndef(key: string): string | undefined {
	const value = t(key, {}, { missingWarn: false, fallbackWarn: false })
	return value === key ? undefined : value
}

function resolveTitle(path: string, schema: Record<string, unknown>): string | undefined {
	if (!path.includes('.') && !path.includes('*') && !path.includes('[')) {
		return tOrUndef(`form.compose_schema.properties.${path}.label`) ?? (schema.title as string | undefined)
	}
	return undefined
}

function resolveDescription(path: string, schema: Record<string, unknown>): string | undefined {
	const segs = path.split('.')
	let key: string | undefined
	if (segs.length === 1 && segs[0]) key = `form.compose_schema.properties.${segs[0]}.description`
	else if (segs.length === 3 && segs[0] === 'services')
		key = `form.compose_schema.$defs.service.properties.${segs[2]}.description`
	return key
		? (tOrUndef(key) ?? (schema.description as string | undefined))
		: (schema.description as string | undefined)
}

function composeIcon(name: string): string | undefined {
	return ICONS.compose[name as keyof typeof ICONS.compose]
}

const composeJson: JsonSchema = normalizeSchema(
	composeSpec as JsonSchema,
	booleanStringNormalizer,
	widgetsNormalizer({
		'#/$defs/service/properties/image': 'compose-image',
	}),
)
</script>

<template>
	<JsonSchemaEditor
		v-model="model"
		:schema="composeJson"
		:title="t('form.compose_schema.title')"
		:description="t('form.compose_schema.description')"
		:resolve-title="resolveTitle"
		:resolve-description="resolveDescription"
		format-output="yaml"
		:import-label="t('form.schema_form.import_compose')"
		:icon="composeIcon"
		:widgets="{ 'compose-image': ComposeImagePicker }"
	/>
</template>
