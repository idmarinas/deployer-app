<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		code?: 'not_found' | 'unknown'
		module?: 'default' | 'project' | 'host' | 'passkey' | 'variable'
		icon?: string
	}>(),
	{
		code: 'unknown',
		module: 'default',
		icon: 'i-tabler-exclamation-circle',
	},
)

const { t } = useI18n()

const module = computed(() => {
	return props.code === 'unknown' ? '' : props.module + '.'
})
</script>

<template>
	<UError
		:icon="icon"
		:clear="false"
		:ui="{ root: 'h-full min-h-full' }"
		:error="{
			statusMessage: t(`components.error.${code}.${module}statusMessage`),
			message: t(`components.error.${code}.${module}message`),
		}"
	/>
</template>
