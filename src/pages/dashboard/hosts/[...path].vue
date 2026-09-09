<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ModulesName } from '@/utils/deployer-app'
import { getModuleIcon } from '@/utils/icons'

const { t } = useI18n()

definePage({
	name: 'dashboard-hosts-not-found',
})
</script>

<template>
	<UError
		:icon="getModuleIcon(ModulesName.Hosts, 'off')"
		:clear="false"
		:error="{
			statusCode: 404,
			statusMessage: t('components.error.not_found.host.statusMessage'),
			message: t('components.error.not_found.host.message'),
		}"
		:ui="{ root: 'h-full min-h-full' }"
	/>
</template>
