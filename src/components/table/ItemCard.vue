<script lang="ts">
import type { JSONContent } from '@tiptap/core'

import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
const props = defineProps<{
	id: number
	name: string
	description?: JSONContent
	enabled?: boolean
	created_at: string
	updated_at: string
}>()

const { t, locale } = useI18n()
</script>

<template>
	<UCard>
		<template #title>
			<div class="flex items-center justify-between">
				<div class="flex gap-3 items-center">
					<UChip :color="enabled ? 'success' : 'error'" size="md" :show="enabled !== undefined">
						<span class="text-lg font-semibold">{{ name }}</span>
					</UChip>
					<UBadge color="neutral" variant="soft" size="sm" class="font-mono"> ID: {{ id }} </UBadge>
				</div>
				<div>
					<slot name="title-right" />
				</div>
			</div>
		</template>

		<template #description>
			<DescriptionViewer :value="description" />
		</template>

		<template #default>
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
