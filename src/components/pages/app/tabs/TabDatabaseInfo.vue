<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDeployerAppDatabaseInfo } from '@/loaders/deployerApp'
</script>

<script setup lang="ts">
const { t } = useI18n()

const { data: componentData, isLoading, status } = useDeployerAppDatabaseInfo()

const totalRows = computed(() => {
	const app = componentData.value?.tables.reduce((sum, t) => sum + t.row_count, 0) ?? 0
	const other = componentData.value?.other_tables?.row_count ?? 0
	return app + other
})

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<template>
	<!-- Base de datos -->
	<UCard
		v-if="!isLoading && status === 'success'"
		:title="t('pages.app.settings.sections.database.label')"
		:description="t('pages.app.settings.sections.database.description')"
	>
		<div class="grid gap-4">
			<UFieldGroup class="w-full">
				<UBadge :label="t('pages.app.settings.sections.database.path')" variant="soft" />
				<UInput
					class="grow"
					:model-value="componentData.path"
					:placeholder="t('pages.app.settings.sections.database.not_configured')"
					readonly
				/>
			</UFieldGroup>

			<USeparator />

			<div class="flex flex-wrap gap-4 text-sm">
				<div class="flex items-center gap-1.5">
					<span class="text-dimmed">{{ t('pages.app.settings.sections.database.total_size') }}:</span>
					<UBadge variant="subtle" color="neutral">{{ formatBytes(componentData.file_size_bytes) }}</UBadge>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-dimmed">{{ t('pages.app.settings.sections.database.tables') }}:</span>
					<UBadge variant="subtle" color="neutral">{{ componentData.table_count }}</UBadge>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-dimmed">{{ t('pages.app.settings.sections.database.pages') }}:</span>
					<UBadge variant="subtle" color="neutral">{{ componentData.page_count.toLocaleString() }}</UBadge>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-dimmed">{{ t('pages.app.settings.sections.database.page_size') }}:</span>
					<UBadge variant="subtle" color="neutral">{{ formatBytes(componentData.page_size) }}</UBadge>
				</div>
			</div>
			<USeparator />

			<div class="grid gap-3">
				<div v-for="table in componentData.tables" :key="table.name" class="grid gap-1">
					<div class="flex items-center justify-between">
						<span class="text-sm font-mono">{{ table.name }}</span>
						<div class="flex items-center gap-2">
							<span class="text-xs text-dimmed"
								>{{ table.row_count.toLocaleString() }} {{ t('pages.app.settings.sections.database.rows') }}</span
							>
							<UBadge variant="subtle" color="neutral" size="sm">{{ formatBytes(table.size_bytes) }}</UBadge>
						</div>
					</div>
					<UProgress :model-value="table.row_count" :max="totalRows" size="xs" color="primary" />
				</div>

				<div v-if="componentData.other_tables" class="grid gap-1">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon name="i-tabler-stack" class="size-4 text-dimmed" />
							<span class="text-sm text-dimmed">
								{{ t('pages.app.settings.sections.database.other_tables') }} ({{ componentData.other_tables.count }})
							</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-xs text-dimmed"
								>{{ componentData.other_tables.row_count.toLocaleString() }}
								{{ t('pages.app.settings.sections.database.rows') }}</span
							>
							<UBadge variant="subtle" color="neutral" size="sm">
								{{ formatBytes(componentData.other_tables.size_bytes) }}
							</UBadge>
						</div>
					</div>
					<UProgress :model-value="componentData.other_tables.row_count" :max="totalRows" size="xs" color="neutral" />
				</div>
			</div>
		</div>
	</UCard>
	<Loading v-else-if="isLoading" />
	<GeneralError v-else-if="!isLoading && status === 'error'" />
</template>
