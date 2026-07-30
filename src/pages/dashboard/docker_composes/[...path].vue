<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { getModuleIcon } from '@/utils/icons'

const { t } = useI18n()
</script>

<template>
	<UError
		:icon="getModuleIcon('docker_composes', 'off')"
		:clear="false"
		:error="{
			statusCode: 404,
			statusMessage: t('components.error.not_found.docker_compose.statusMessage'),
			message: t('components.error.not_found.docker_compose.message'),
		}"
		:ui="{ root: 'h-full min-h-full' }"
	/>
</template>
