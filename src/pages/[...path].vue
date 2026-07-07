<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
	<UError
		icon="i-tabler-file-x"
		:clear="{ to: '/dashboard' }"
		:error="{
			statusCode: 404,
			statusMessage: t('components.error.not_found.default.statusMessage'),
			message: t('components.error.not_found.default.message'),
		}"
	/>
</template>
