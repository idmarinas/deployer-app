<script setup lang="ts">
import type { JsonSchema } from 'json-schema-library'

import composerSpec from '@/schemas/composer-schema.json'
import { normalizeSchema } from '@/utils/schema-form/normalize'

const model = defineModel<string | null>()

const composerJson: JsonSchema = normalizeSchema(composerSpec as JsonSchema)
</script>

<template>
	<JsonSchemaEditor
		v-model="model"
		:schema="composerJson"
		:title="composerJson.title as string | undefined"
		:description="composerJson.description as string | undefined"
		format-output="json"
	/>
</template>
