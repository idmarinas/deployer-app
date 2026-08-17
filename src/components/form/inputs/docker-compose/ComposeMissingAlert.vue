<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
	<UAlert
		color="warning"
		variant="soft"
		icon="i-tabler-brand-docker"
		:title="t('form.docker_composes.files.compose_missing')"
		:description="t('form.docker_composes.files.compose_missing_hint')"
	/>
</template>
