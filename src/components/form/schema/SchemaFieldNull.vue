<script setup lang="ts">
import { computed } from 'vue'
import type { SchemaNode } from 'json-schema-library'

import { variantDefault } from '@/utils/schema-form/jsl'
import { useSchemaFormContext } from './context'

const props = defineProps<{ path: string; node?: SchemaNode }>()

const form = useSchemaFormContext()

const isNull = computed(() => form.get(props.path) === null)

function toggleNull(on: boolean) {
	if (on) form.set(props.path, null)
	else if (props.node) form.set(props.path, variantDefault(props.node))
	else form.remove(props.path)
}
</script>

<template>
	<USwitch :model-value="isNull" @update:model-value="toggleNull" />
</template>
