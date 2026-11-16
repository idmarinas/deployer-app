<script lang="ts">
import { ModulesName } from '@/utils/deployer-app'
import { getModuleIcon, ICONS } from '@/utils/icons'
import { useI18n } from 'vue-i18n'
import { RouteLocationRaw } from 'vue-router'
</script>

<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(
	defineProps<{
		module: ModulesName
		reloadFn: () => void
		addRoute?: RouteLocationRaw
		/** Si se omite, usa el título del módulo en `components.empty_list`. */
		title?: string
		/** Si se omite, usa la descripción del módulo en `components.empty_list`. */
		description?: string
		/** Oculta el botón de alta (p. ej. en la pestaña Inactivos). */
		showAdd?: boolean
	}>(),
	{
		showAdd: true,
	},
)
</script>

<template>
	<UEmpty
		:icon="getModuleIcon(props.module)"
		:title="props.title ?? t(`components.empty_list.${props.module}.title`)"
		:description="props.description ?? t(`components.empty_list.${props.module}.description`)"
		:actions="[
			...(props.showAdd
				? [
						{
							icon: ICONS.actions.add,
							label: t(`components.empty_list.${props.module}.add.label`),
							to: props.addRoute,
						},
					]
				: []),
			{
				icon: ICONS.actions.refresh,
				label: t('common.actions.refresh'),
				color: 'neutral',
				variant: 'soft',
				onClick: () => props.reloadFn(),
			},
		]"
	/>
</template>
