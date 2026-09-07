<script lang="ts">
import { eq } from 'drizzle-orm'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { db } from '@/drizzle/drizzle'
import { getSqliteTableByModuleName, ModulesName } from '@/utils/deployer-app'
import { getModuleIcon } from '@/utils/icons'
</script>

<script setup lang="ts">
const props = defineProps<{
	module: ModulesName
}>()

const { t, n } = useI18n()

const countTotal = ref(0)
const countEnabled = ref<number | undefined>(undefined)

onMounted(async () => {
	const table = getSqliteTableByModuleName(props.module)

	if (table.enabled) {
		db.$count(table, eq(table.enabled, true)).then(count => (countEnabled.value = count))
	}

	db.$count(table).then(count => (countTotal.value = count))
})
</script>

<template>
	<UCard>
		<!-- <template #header> -->
		<div class="flex items-center gap-2">
			<UAvatar :icon="getModuleIcon(module)" color="primary" size="2xl" />
			<div class="grow flex flex-col gap-2">
				<span class="text-xl font-bold">{{ n(countTotal, 'n') }}</span>
				<span class="text-sm text-dimmed">{{ t(`components.dashboard.summary.${module}.title`) }}</span>
			</div>
		</div>
		<!-- </template> -->

		<div v-if="countEnabled !== undefined" class="flex items-center justify-between gap-3 text-xs text-dimmed mt-3">
			<div class="flex items-center gap-1.5">
				<UIcon name="i-tabler-circle-check" class="size-3.5 text-success" />
				<span>{{ t('components.dashboard.summary.enabled', { count: countEnabled }) }}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<UIcon name="i-tabler-circle" class="size-3.5 text-error" />
				<span>{{ t('components.dashboard.summary.disabled', { count: countTotal - countEnabled }) }}</span>
			</div>
		</div>
	</UCard>
</template>
