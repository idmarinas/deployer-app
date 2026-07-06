<script lang="ts">
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
	<UError
		icon="i-tabler-exclamation-circle"
		:clear="{ to: { name: 'dashboard-home' } }"
		:ui="{ root: 'h-full min-h-full' }"
		:error="{
			statusMessage: t(`components.error.unknown.statusMessage`),
			message: t(`components.error.unknown.message`),
		}"
	/>
</template>
