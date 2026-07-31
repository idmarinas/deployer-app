<script lang="ts">
import { useDeployerAppMigrations } from '@/loaders/deployerApp'
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const { t, d } = useI18n()

const { data: componentData, isLoading, status } = useDeployerAppMigrations()

function formatNanoseconds(ns: number): string {
	if (ns < 1_000) return `${ns} ns`
	if (ns < 1_000_000) return `${(ns / 1_000).toFixed(1)} µs`
	if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(1)} ms`
	return `${(ns / 1_000_000_000).toFixed(2)} s`
}
</script>

<template>
	<!-- Migraciones -->
	<UCard v-if="!isLoading && status == 'success'">
		<template #header>
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">
						{{ t('pages.app.settings.sections.database.migrations') }}
					</h2>
					<UBadge variant="subtle" color="neutral" size="sm">
						{{ t('pages.app.settings.sections.database.migrations_applied', { count: componentData.length }) }}
					</UBadge>
				</div>
			</div>
		</template>

		<div v-if="componentData.length > 0" class="divide-y-2">
			<div v-for="migration in componentData" :key="migration.version" class="flex items-center justify-between py-1.5">
				<div class="flex items-center gap-3">
					<UBadge :color="migration.success ? 'success' : 'error'" variant="soft">
						{{ migration.version }}
					</UBadge>
					<div class="flex flex-col">
						<span class="text-sm font-mono capitalize">{{ migration.description }}</span>
						<span class="text-xs text-dimmed">{{ d(migration.installed_on, 'long') }}</span>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<UBadge variant="subtle" color="neutral" size="sm">
						{{ formatNanoseconds(migration.execution_time_ns) }}
					</UBadge>
					<UBadge :color="migration.success ? 'success' : 'error'" variant="soft" size="sm">
						{{
							migration.success
								? t('pages.app.settings.sections.database.migration_success')
								: t('pages.app.settings.sections.database.migration_failed')
						}}
					</UBadge>
				</div>
			</div>
		</div>

		<p v-else class="text-sm text-dimmed">
			{{ t('pages.app.settings.sections.database.migrations_applied', { count: componentData.length }) }}
		</p>
	</UCard>
	<Loading v-else-if="isLoading" />
	<GeneralError v-else-if="!isLoading && status === 'error'" />
	<template v-else>cosas </template>
</template>
