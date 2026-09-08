<!-- Página para gestionar migraciones -->

<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

import { computed } from 'vue'

// Composables
import { useI18n } from 'vue-i18n'
import { useAppMigrations } from '../../composables/deployer/useAppMigrations'

const { t } = useI18n()
const { buttons, steps, currentStep, runMigrations, resetMigration } = useAppMigrations()

const links = computed<ButtonProps[]>(() => {
	const items: ButtonProps[] = [
		{
			label: t('pages.migrations.buttons.run'),
			color: 'primary',
			disabled: buttons.value.run.disabled,
			loading: buttons.value.run.loading,
			icon: 'i-tabler-play',
			onClick: async () => {
				await runMigrations()
			},
		},
	]

	// Mostrar el botón de reinicio condicionalmente
	if (buttons.value.restart.show) {
		items.push({
			label: t('pages.app.setup.buttons.restart'),
			color: 'warning',
			variant: 'soft',
			icon: 'i-tabler-refresh',
			disabled: buttons.value.restart.disabled,
			loading: buttons.value.restart.loading,
			onClick: () => resetMigration(),
		})
	}

	return items
})
</script>

<template>
	<UPageHero
		:links="links"
		:headline="t('pages.migrations.headline')"
		:title="t('pages.migrations.title')"
		:description="t('pages.migrations.description')"
	>
		<UStepper :items="steps" value-key="id" :default-value="currentStep" disabled />
	</UPageHero>
</template>
