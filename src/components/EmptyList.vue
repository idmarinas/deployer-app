<script lang="ts">
import { getModuleIcon, ICONS } from '@/utils/icons'
import { useI18n } from 'vue-i18n'
import { RouteLocationRaw } from 'vue-router'
</script>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
	module: 'projects' | 'tasks' | 'passkeys' | 'hosts' | 'variables' | 'global_variables' | 'docker_composes'
	reloadFn: () => void
	addRoute?: RouteLocationRaw
}>()
</script>

<template>
	<UEmpty
		:icon="getModuleIcon(props.module)"
		:title="t(`pages.${props.module}.table.empty.title`)"
		:description="t(`pages.${props.module}.table.empty.description`)"
		:actions="[
			{
				icon: ICONS.actions.add,
				label: t(`components.buttons.${props.module}.add.label`),
				to: props.addRoute,
			},
			{
				icon: ICONS.actions.refresh,
				label: t('common.actions.refresh'),
				color: 'neutral',
				variant: 'soft',
				onClick: () => reloadFn(),
			},
		]"
	/>
</template>
