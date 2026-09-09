<script lang="ts">
import { ModulesName } from '@/utils/deployer-app'
import { getModuleIcon, ICONS } from '@/utils/icons'
import { useI18n } from 'vue-i18n'
import { RouteLocationRaw } from 'vue-router'
</script>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
	module: ModulesName
	reloadFn: () => void
	addRoute?: RouteLocationRaw
}>()
</script>

<template>
	<UEmpty
		:icon="getModuleIcon(props.module)"
		:title="t(`components.empty_list.${props.module}.title`)"
		:description="t(`components.empty_list.${props.module}.description`)"
		:actions="[
			{
				icon: ICONS.actions.add,
				label: t(`components.empty_list.${props.module}.add.label`),
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
