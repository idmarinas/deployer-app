<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { useHostSelectPopulate } from '@/loaders/hosts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type SelectMenuItemExtends = SelectMenuItem & {
	id: number
	username: string
	enabled: boolean
}
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		ignoreHosts?: Set<number>
		onlyEnabled?: boolean
	}>(),
	{
		onlyEnabled: false,
	},
)

const { t } = useI18n()
const { data: items, isLoading } = useHostSelectPopulate()

const availableItems = computed(() => {
	const ignoreHosts = props.ignoreHosts || new Set([])
	const itemsFiltered = ((items.value ?? []) as any[]).filter(host => !ignoreHosts.has(host.id))

	if (props.onlyEnabled) {
		return itemsFiltered.filter(host => host.enabled === true)
	}

	return itemsFiltered
})
</script>

<template>
	<USelectMenu
		clear
		value-key="id"
		:items="availableItems as SelectMenuItemExtends[]"
		:loading="isLoading"
		:disabled="isLoading"
		:placeholder="t('form.shared.placeholder.hosts.select')"
		icon="i-tabler-server"
	>
		<template #item-leading="{ item }">
			<UBadge
				:color="item.enabled ? 'success' : 'error'"
				variant="outline"
				:icon="item.enabled ? 'i-tabler-server' : 'i-tabler-server-off'"
				size="sm"
			/>
		</template>
		<template #item-trailing="{ item }">
			<UBadge color="neutral" variant="outline" icon="i-tabler-user" size="sm">{{ item.username }}</UBadge>
		</template>
	</USelectMenu>
</template>
