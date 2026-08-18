<!-- Componente usando en las páginas de vistas (view).vue -->

<script lang="ts">
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = defineProps<{
	id: number
	enabled: boolean
	description?: object
	created_at: string
	updated_at: string
	onToggle?: (input: { enabled: boolean }) => Promise<boolean>
	onUpdatedEnabled: (enabled: boolean) => void
}>()

const { t, locale } = useI18n()
</script>

<template>
	<UCard :ui="{ title: 'flex justify-between' }">
		<template #title>
			<div class="flex items-center gap-2">
				<UBadge color="neutral" variant="soft"> ID: {{ id }} </UBadge>
				<ToggleEnabled :enabled="enabled" :on-toggle="onToggle" @updated="onUpdatedEnabled" />
			</div>
			<div class="flex items-center gap-2">
				<slot name="title-right" />
			</div>
		</template>

		<template #description>
			<DescriptionViewer :value="description" :placeholder="t('common.empty.description')" />
		</template>

		<template v-if="$slots.default" #default>
			<slot />
		</template>

		<template #footer>
			<div class="flex gap-4 items-center justify-between text-xs text-muted">
				<span class="flex gap-1.5 items-center">
					<UIcon name="i-tabler-calendar-plus" class="size-4" />
					<strong>{{ t('entity.common.created_at') }}:</strong>
					{{ new Date(created_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
				</span>
				<span class="flex gap-1.5 items-center">
					<UIcon name="i-tabler-calendar-time" class="size-4" />
					<strong>{{ t('entity.common.updated_at') }}:</strong>
					{{ new Date(updated_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' }) }}
				</span>
			</div>
		</template>
	</UCard>
</template>
