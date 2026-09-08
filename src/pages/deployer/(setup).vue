<!-- Página para la configuración inicial. -->
<script lang="ts">
import type { ButtonProps } from '@nuxt/ui'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDeployerAppConfigure } from '@/composables/deployer/useDeployerAppConfigure'
import { ICONS } from '@/utils/icons'

// Tauri related
import { open, save } from '@tauri-apps/plugin-dialog'
</script>

<script setup lang="ts">
const { t } = useI18n()
const { steps, currentStep, buttons, databaseCreate, databaseLoad, resetSetup } = useDeployerAppConfigure()

const links = computed<ButtonProps[]>(() => {
	const items: ButtonProps[] = [
		// Seleccionar base de datos existente
		{
			label: t('pages.setup.buttons.select'),
			icon: ICONS.database.databaseSearch,
			disabled: buttons.value.select.disabled,
			loading: buttons.value.select.loading,
			onClick: async () => {
				const selected = await open({
					directory: false,
					multiple: false,
					title: t('pages.setup.buttons.select'),
					filters: [
						{
							name: 'SQLite Files',
							extensions: ['sqlite'],
						},
					],
				})

				await databaseLoad(selected)
			},
		},
		{
			// Crear la base de datos
			label: t('pages.setup.buttons.create'),
			color: 'neutral',
			variant: 'subtle',
			icon: ICONS.database.databasePlus,
			disabled: buttons.value.create.disabled,
			loading: buttons.value.create.loading,
			onClick: async () => {
				const selected = await save({
					title: t('pages.setup.buttons.create'),
					defaultPath: 'deployer-app.sqlite',
					filters: [
						{
							name: 'SQLite Files',
							extensions: ['sqlite'],
						},
					],
				})

				await databaseCreate(selected)
			},
		},
	]

	// Mostrar el botón de reinicio condicionalmente
	if (buttons.value.restart.show) {
		items.push({
			label: t('pages.setup.buttons.restart'),
			color: 'warning',
			variant: 'soft',
			icon: ICONS.actions.refresh,
			disabled: buttons.value.restart.disabled,
			loading: buttons.value.restart.loading,
			onClick: () => resetSetup(),
		})
	}

	return items
})
</script>

<template>
	<UPageHero
		:links="links"
		:headline="t('pages.setup.headline')"
		:title="t('pages.setup.title')"
		:description="t('pages.setup.description')"
	>
		<UStepper :items="steps" value-key="id" :default-value="currentStep" disabled />
	</UPageHero>
</template>
