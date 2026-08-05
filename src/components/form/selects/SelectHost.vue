<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { useHostSelectPopulate } from '@/loaders/hosts'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { ICONS } from '@/utils/icons'

type SelectMenuItemExtends = SelectMenuItem & {
	id: number
	username: string
	enabled: boolean
}
</script>

<script setup lang="ts">
const state = defineModel<number | undefined>()
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
const router = useRouter()
const { data: items, isLoading } = useHostSelectPopulate()

const availableItems = computed(() => {
	const ignoreHosts = props.ignoreHosts || new Set([])
	const itemsFiltered = ((items.value ?? []) as any[]).filter(host => !ignoreHosts.has(host.id))

	if (props.onlyEnabled) {
		return itemsFiltered.filter(host => host.enabled === true)
	}

	return itemsFiltered
})

watch(
	() => props.onlyEnabled,
	() => {
		if (!availableItems.value.find(item => item.id === state.value)) {
			state.value = undefined
		}
	},
)
</script>

<template>
	<UFieldGroup>
		<USelectMenu
			v-model="state"
			clear
			value-key="id"
			class="w-full"
			:items="availableItems as SelectMenuItemExtends[]"
			:loading="isLoading"
			:disabled="isLoading"
			:placeholder="t('form.shared.placeholder.hosts.select')"
			:icon="ICONS.server.server"
		>
			<template #item-leading="{ item }">
				<UBadge
					:color="item.enabled ? 'success' : 'error'"
					variant="outline"
					:icon="item.enabled ? ICONS.server.server : ICONS.server.serverOff"
					size="sm"
				/>
			</template>
			<template #item-trailing="{ item }">
				<UBadge color="neutral" variant="outline" icon="i-tabler-user" size="sm" :label="item.username" />
			</template>
		</USelectMenu>
		<UTooltip :text="t('form.hosts.title.add')" :delay-duration="0">
			<UButton
				:loading="isLoading"
				:disabled="isLoading"
				:icon="ICONS.actions.add"
				@click="router.push({ name: 'dashboard-hosts-add' })"
			/>
		</UTooltip>
	</UFieldGroup>
</template>
