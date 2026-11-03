<script lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { SeedRecord, SeedSource } from '@/composables/deployer/seed_data'

import { useQueryCache } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { SEED_SOURCES } from '@/composables/deployer/seed_data'
import { useAppSeed } from '@/composables/deployer/useAppSeed'
import { invalidateCacheQueries } from '@/composables/queries/shared'
import useToaster from '@/composables/useToaster'
import { ICONS } from '@/utils/icons'

type SeedAccordionItem = AccordionItem & {
	source: SeedSource
	records: SeedRecord[]
}
</script>

<script setup lang="ts">
const { t } = useI18n()
const toaster = useToaster()
const cacheQuery = useQueryCache()
const { reset } = useAppSeed()

const resetting = ref<string | null>(null)

const accordionItems = computed<SeedAccordionItem[]>(() =>
	SEED_SOURCES.map(source => ({
		label: source.label(t),
		icon: source.icon,
		value: source.id,
		source,
		records: source.records(t),
	})),
)

function recordActionId(source: SeedSource, record: SeedRecord): string {
	return `record:${source.id}:${record.key}`
}

function sourceActionId(source: SeedSource): string {
	return `source:${source.id}`
}

function isBusy(actionId: string): boolean {
	return resetting.value === actionId
}

function isDisabled(actionId: string): boolean {
	return resetting.value !== null && resetting.value !== actionId
}

async function onResetRecord(source: SeedSource, record: SeedRecord) {
	const actionId = recordActionId(source, record)

	resetting.value = actionId

	try {
		await reset(source.id, [record.key])
		await invalidateCacheQueries(cacheQuery, source.cacheKey)

		toaster.success(t('pages.app.settings.sections.database.defaults_record_reset_success', { name: record.name }))
	} catch {
		toaster.error(t('pages.app.settings.sections.database.defaults_reset_error'))
	} finally {
		resetting.value = null
	}
}

async function onResetSource(source: SeedSource) {
	const actionId = sourceActionId(source)

	resetting.value = actionId

	try {
		await reset(source.id)
		await invalidateCacheQueries(cacheQuery, source.cacheKey)

		toaster.success(
			t('pages.app.settings.sections.database.defaults_source_reset_success', {
				name: source.label(t),
				count: source.records(t).length,
			}),
		)
	} catch {
		toaster.error(t('pages.app.settings.sections.database.defaults_reset_error'))
	} finally {
		resetting.value = null
	}
}

async function onResetAll() {
	resetting.value = 'all'

	try {
		await reset()

		await Promise.all(SEED_SOURCES.map(source => invalidateCacheQueries(cacheQuery, source.cacheKey)))

		const count = SEED_SOURCES.reduce((total, source) => total + source.records(t).length, 0)

		toaster.success(t('pages.app.settings.sections.database.defaults_all_reset_success', { count }))
	} catch {
		toaster.error(t('pages.app.settings.sections.database.defaults_reset_error'))
	} finally {
		resetting.value = null
	}
}
</script>

<template>
	<UCard>
		<template #title>
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-semibold">
					{{ t('pages.app.settings.sections.database.defaults') }}
				</h2>
				<UButton
					:icon="ICONS.actions.reset"
					color="primary"
					variant="soft"
					:label="t('pages.app.settings.sections.database.defaults_reset_all')"
					:loading="isBusy('all')"
					:disabled="isDisabled('all')"
					@click="onResetAll"
				/>
			</div>
		</template>

		<div class="flex flex-col gap-4">
			<p class="text-sm text-dimmed">
				{{ t('pages.app.settings.sections.database.defaults_description') }}
			</p>

			<div class="rounded-md border border-default px-3">
				<UAccordion type="multiple" :items="accordionItems">
					<template #default="{ item }">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-medium">{{ item.label }}</span>
							<UBadge
								variant="subtle"
								color="neutral"
								size="sm"
								:label="t('pages.app.settings.sections.database.defaults_records', { count: item.records.length })"
							/>
							<UBadge variant="subtle" color="neutral" size="sm" class="font-mono">
								{{ item.source.file }}
							</UBadge>
						</div>
					</template>

					<template #body="{ item }">
						<div class="flex flex-col gap-3">
							<div class="flex justify-end">
								<UButton
									:icon="ICONS.actions.reset"
									size="sm"
									color="warning"
									variant="soft"
									:label="t('pages.app.settings.sections.database.defaults_reset_source')"
									:loading="isBusy(sourceActionId(item.source))"
									:disabled="isDisabled(sourceActionId(item.source))"
									@click="onResetSource(item.source)"
								/>
							</div>

							<div class="flex flex-col divide-y divide-default rounded-md border border-default">
								<div
									v-for="record in item.records"
									:key="record.key"
									class="flex items-center justify-between gap-3 px-3 py-2"
								>
									<div class="flex min-w-0 flex-col gap-0.5">
										<span class="truncate text-sm">{{ record.name }}</span>
										<span class="truncate font-mono text-xs text-dimmed">{{ record.key }}</span>
									</div>

									<UButton
										:icon="ICONS.actions.reset"
										size="xs"
										color="neutral"
										variant="ghost"
										:label="t('pages.app.settings.sections.database.defaults_reset')"
										:loading="isBusy(recordActionId(item.source, record))"
										:disabled="isDisabled(recordActionId(item.source, record))"
										@click="onResetRecord(item.source, record)"
									/>
								</div>
							</div>
						</div>
					</template>
				</UAccordion>
			</div>
		</div>
	</UCard>
</template>
