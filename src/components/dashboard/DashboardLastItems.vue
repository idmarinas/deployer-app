<script lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { db } from '@/drizzle/drizzle'
import { getSqliteTableByModuleName, ModulesName } from '@/utils/deployer-app'
import { getModuleIcon } from '@/utils/icons'
import { asc } from 'drizzle-orm'
</script>

<script setup lang="ts">
const props = defineProps<{
	module: ModulesName
}>()

const { t } = useI18n()

const items = ref<{ [x: string]: any }[]>([])

onMounted(async () => {
	const table = getSqliteTableByModuleName(props.module)

	db.select()
		.from(table)
		.limit(5)
		.orderBy(asc(table.created_at))
		.then(rows => (items.value = rows))
})
</script>

<template>
	<UCard>
		<template #title>
			{{ t(`components.dashboard.last_items.${module}.title`) }}
		</template>

		<div class="divide-y divide-default -mx-3">
			<RouterLink
				v-for="item in items"
				:key="item.id"
				:to="{ name: `dashboard-${module}-id` as any, params: { id: item.id } }"
				class="flex items-center justify-between px-3 py-2.5 hover:bg-elevated/50 transition-colors"
			>
				<div class="flex items-center gap-2 min-w-0">
					<UIcon
						:name="item.enabled ? getModuleIcon(module, 'singular') : getModuleIcon(module, 'off')"
						class="size-4 shrink-0"
						:class="item.enabled ? 'text-success' : 'text-error'"
					/>
					<span class="text-sm truncate">{{ item.name }}</span>
				</div>
				<UBadge :color="item.enabled ? 'success' : 'error'" variant="subtle" size="xs" class="shrink-0">
					{{ item.enabled ? 'Activo' : 'Inactivo' }}
				</UBadge>
			</RouterLink>
		</div>
	</UCard>
</template>
