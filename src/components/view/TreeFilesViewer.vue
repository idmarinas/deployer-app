<script lang="ts">
import type { ManagedTreeNode } from '@/lib/files'

import { useI18n } from 'vue-i18n'

import CreateFileDialog from '@/components/overlay/forms/CreateFileDialog.vue'
</script>

<script setup lang="ts">
const props = defineProps<{
	items: ManagedTreeNode[]
	onCreateFile: (fileName: string, folder: string) => string | undefined
	canCreateFile?: boolean
}>()
const selected = defineModel<ManagedTreeNode>()

const { t } = useI18n()
const overlay = useOverlay()

async function openCreateDialog(folder: string) {
	const dialog = overlay.create(CreateFileDialog, { destroyOnClose: true })

	let error = undefined
	let fileName = await dialog.open({ folder, error })

	do {
		error = fileName !== false ? props.onCreateFile(fileName, folder) : undefined
		fileName = await dialog.open({ folder, error })
	} while (fileName !== false && error !== undefined)
}
</script>

<template>
	<div class="flex items-center justify-between gap-2">
		<UBadge :label="t('form.files.label')" icon="i-tabler-files" variant="subtle" />
		<div class="flex items-center gap-1">
			<slot name="actions" />
			<UTooltip v-if="props.canCreateFile" :text="t('form.files.create_file')">
				<UButton icon="i-tabler-file-plus" variant="ghost" size="xs" @click.stop="openCreateDialog('')" />
			</UTooltip>
		</div>
	</div>
	<p v-if="items.length === 0" class="text-sm text-muted">{{ t('form.files.empty') }}</p>
	<UTree v-model="selected" :items="items" :get-key="node => node.key" :as="{ link: 'div' }">
		<template #item-trailing="{ item }">
			<slot name="badges" :item="item" />
		</template>
		<template #folder-trailing="{ item, expanded: isExpanded }">
			<UIcon :name="isExpanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-right'" class="size-4 shrink-0" />
			<UTooltip v-if="props.canCreateFile" :text="t('form.files.create_file')">
				<UButton icon="i-tabler-folder-plus" variant="ghost" size="xs" @click.stop="openCreateDialog(item.key)" />
			</UTooltip>
		</template>
	</UTree>
</template>
