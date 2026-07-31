<script lang="ts">
import { useI18n } from 'vue-i18n'

import { ICONS } from '@/utils/icons'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-app',
})

const { t } = useI18n()
</script>

<template>
	<div class="grid gap-2 grid-cols-1 @md:grid-cols-2">
		<!-- Apariencia -->
		<UCard
			:title="t('pages.app.settings.sections.appearance.label')"
			:description="t('pages.app.settings.sections.appearance.description')"
		>
			<div class="flex gap-4 w-full">
				<UFormField class="grow" :label="t('pages.app.settings.sections.appearance.theme')">
					<UColorModeSelect class="w-full" />
				</UFormField>

				<UFormField class="grow" :label="t('pages.app.settings.sections.appearance.language')">
					<LocaleChange class="w-full" />
				</UFormField>
			</div>
		</UCard>
	</div>

	<UTabs
		:items="[
			{
				icon: ICONS.misc.infoCircle,
				label: t('pages.app.settings.sections.information.label'),
				slot: 'info',
			},
			{
				icon: ICONS.database.database,
				label: t('pages.app.settings.sections.database.label'),
				slot: 'database',
			},
			{
				icon: ICONS.database.databaseImport,
				label: t('pages.app.settings.sections.database.migrations'),
				slot: 'migrations',
			},
		]"
	>
		<template #info><TabAppInfo /></template>
		<template #database><TabDatabaseInfo /></template>
		<template #migrations><TabMigrations /></template>
	</UTabs>
</template>
