<script lang="ts">
import type { ComposeTreeNode } from '@/lib/docker-compose/files'

import { useI18n } from 'vue-i18n'

import CreateFileDialog from '@/components/overlay/forms/CreateFileDialog.vue'
</script>

<script setup lang="ts">
const props = defineProps<{
	items: ComposeTreeNode[]
	onCreateFile: (fileName: string) => string | undefined
}>()
const selected = defineModel<ComposeTreeNode>()

const { t } = useI18n()
const overlay = useOverlay()

async function openCreateDialog(folder: string) {
	const dialog = overlay.create(CreateFileDialog, {
		destroyOnClose: true,
		props: { folder },
	})

	let fileName = await dialog.open()
	let error = props.onCreateFile(fileName)

	while (error !== undefined) {
		fileName = await dialog.open({ error, folder })
		error = props.onCreateFile(fileName)
	}
}
</script>

<template>
	<div class="flex items-center justify-between gap-2">
		<UBadge :label="t('form.docker_composes.files.label')" icon="i-tabler-files" variant="subtle" />
		<UTooltip :text="t('form.docker_composes.files.create_file')">
			<UButton icon="i-tabler-file-plus" variant="ghost" size="xs" @click.stop="openCreateDialog('')" />
		</UTooltip>
	</div>
	<UTree v-model="selected" :items="items" :get-key="node => node.key" :as="{ link: 'div' }">
		<template #folder-trailing="{ item, expanded: isExpanded }">
			<UIcon :name="isExpanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-right'" class="size-4 shrink-0" />
			<UTooltip :text="t('form.docker_composes.files.create_file')">
				<UButton icon="i-tabler-folder-plus" variant="ghost" size="xs" @click.stop="openCreateDialog(item.key)" />
			</UTooltip>
		</template>
	</UTree>
</template>
