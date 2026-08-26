<script lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useSelectPasskeys } from '@/loaders/passkeys'
import { ICONS } from '@/utils/icons'

type SelectMenuItemExtends = SelectMenuItem & {
	id: number
	enabled: boolean
	key_type: string
}
</script>

<script setup lang="ts">
const state = defineModel<number | undefined>()
const props = withDefaults(
	defineProps<{
		ignore?: Set<number>
		onlyEnabled?: boolean
	}>(),
	{
		onlyEnabled: true,
	},
)

const { t } = useI18n()
const router = useRouter()
const { data: items, isLoading } = useSelectPasskeys()

const availableItems = computed(() => {
	const ignore = props.ignore || new Set([])
	const itemsFiltered = ((items.value ?? []) as any[]).filter(item => !ignore.has(item.id))

	if (props.onlyEnabled) {
		return itemsFiltered.filter(item => item.enabled === true)
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
	<UFieldGroup class="flex items-center">
		<USelectMenu
			v-model="state"
			value-key="id"
			class="flex-1"
			:items="availableItems as SelectMenuItemExtends[]"
			:loading="isLoading"
			:disabled="isLoading"
			:placeholder="t('form.shared.placeholder.passkeys.select')"
			:icon="ICONS.auth.key"
		>
			<template #item-leading="{ item }">
				<UBadge
					:color="item.enabled ? 'success' : 'error'"
					variant="outline"
					:icon="item.enabled ? ICONS.auth.key : ICONS.auth.keyOff"
					size="sm"
				/>
			</template>
			<template #item-trailing="{ item }">
				<UBadge color="neutral" variant="outline" icon="i-tabler-square-key" size="sm" :label="item.key_type" />
			</template>
		</USelectMenu>
		<UTooltip :text="t('form.passkeys.title.add')" :delay-duration="0">
			<UButton
				:loading="isLoading"
				:disabled="isLoading"
				:icon="ICONS.actions.add"
				@click="router.push({ name: 'dashboard-passkeys-add' })"
			/>
		</UTooltip>
	</UFieldGroup>
</template>
