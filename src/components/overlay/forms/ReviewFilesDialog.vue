<script lang="ts" setup>
import type { TreeItem } from '@nuxt/ui'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatBytes } from '@/utils/format'

export interface ReviewFileItem {
	path: string
	size: number
	icon?: string
	reason: 'size' | 'type' | null
}

const props = defineProps<{
	items: ReviewFileItem[]
	existingPaths: string[]
	ignoredDirs?: string[]
}>()

const emits = defineEmits<{
	close: [value: { confirm: boolean; removedPaths: string[] }]
}>()

const { t } = useI18n()

type ReviewAction = 'add' | 'replace' | 'reject_size' | 'reject_type'

interface FileTreeNode extends TreeItem {
	key: string
	type: 'file'
	icon?: string
	action: ReviewAction
	size: number
}

interface FolderTreeNode extends TreeItem {
	key: string
	type: 'folder'
	slot: 'folder'
	children?: ReviewTreeNode[]
}

type ReviewTreeNode = FileTreeNode | FolderTreeNode

const expanded = ref<string[]>([])

const removedPaths = ref<Set<string>>(new Set())

function isRemoved(path: string): boolean {
	return [...removedPaths.value].some(p => path === p || path.startsWith(p + '/'))
}

function removePath(path: string) {
	removedPaths.value = new Set([...removedPaths.value, path])
}

function removeFolder(folderPath: string) {
	removedPaths.value = new Set([...removedPaths.value, folderPath])
}

function restore() {
	removedPaths.value = new Set()
}

const treeItems = computed<ReviewTreeNode[]>(() => {
	const root: ReviewTreeNode[] = []
	const nodeMap = new Map<string, FolderTreeNode>()

	function ensureFolder(folderPath: string): FolderTreeNode {
		const existing = nodeMap.get(folderPath)
		if (existing) return existing
		const parts = folderPath.split('/').filter(Boolean)
		const node: FolderTreeNode = {
			key: folderPath,
			label: parts[parts.length - 1] + '/',
			type: 'folder',
			slot: 'folder',
			children: [],
		}
		nodeMap.set(folderPath, node)
		if (parts.length === 1) {
			root.push(node)
		} else {
			const parent = ensureFolder(parts.slice(0, -1).join('/'))
			parent.children?.push(node)
		}
		return node
	}

	function actionFor(item: ReviewFileItem): ReviewAction {
		if (item.reason === 'type') return 'reject_type'
		if (item.reason === 'size') return 'reject_size'
		if (props.existingPaths.includes(item.path)) return 'replace'
		return 'add'
	}

	for (const item of props.items) {
		if (isRemoved(item.path)) continue
		const name = item.path.split('/').filter(Boolean).pop() ?? item.path
		const node: FileTreeNode = {
			key: item.path,
			label: name,
			type: 'file',
			icon: item.icon,
			action: actionFor(item),
			size: item.size,
		}
		const parts = item.path.split('/').filter(Boolean)
		if (parts.length <= 1) {
			root.push(node)
		} else {
			const folder = ensureFolder(parts.slice(0, -1).join('/'))
			folder.children?.push(node)
		}
	}

	function sortNodes(nodes: ReviewTreeNode[]) {
		nodes.sort((a, b) => {
			if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
			return (a.label ?? '').localeCompare(b.label ?? '')
		})
		for (const n of nodes) {
			if (n.type === 'folder' && n.children?.length) sortNodes(n.children)
		}
	}
	sortNodes(root)
	return root
})

const ignoredDirsLabel = computed(() => (props.ignoredDirs ?? []).map(d => `**/${d}/**`).join(', '))

const folderKeys = computed(() => {
	const keys: string[] = []
	function collect(nodes: ReviewTreeNode[]) {
		for (const n of nodes) {
			if (n.type === 'folder') {
				keys.push(n.key)
				if (n.children?.length) collect(n.children)
			}
		}
	}
	collect(treeItems.value)
	return keys
})

watch(
	folderKeys,
	keys => {
		expanded.value = Array.from(new Set([...expanded.value, ...keys]))
	},
	{ immediate: true },
)

const acceptedCount = computed(() => props.items.filter(i => !i.reason && !isRemoved(i.path)).length)

const removableFolderKeys = computed(() => {
	const keys = new Set<string>()
	for (const item of props.items) {
		if (item.reason || isRemoved(item.path)) continue
		const parts = item.path.split('/').filter(Boolean)
		for (let i = 1; i < parts.length; i++) {
			keys.add(parts.slice(0, i).join('/'))
		}
	}
	return keys
})

const removedFileCount = computed(() => props.items.filter(i => isRemoved(i.path)).length)

function actionLabel(action: ReviewAction): string {
	switch (action) {
		case 'add':
			return t('overlays.dialog.files_review.action_add')
		case 'replace':
			return t('overlays.dialog.files_review.action_replace')
		case 'reject_size':
			return t('overlays.dialog.files_review.action_reject_size')
		case 'reject_type':
			return t('overlays.dialog.files_review.action_reject_type')
	}
}

function actionColor(action: ReviewAction): 'success' | 'primary' | 'info' | 'warning' {
	switch (action) {
		case 'add':
			return 'success'
		case 'replace':
			return 'primary'
		case 'reject_size':
		case 'reject_type':
			return 'warning'
	}
}
</script>

<template>
	<UModal
		:title="t('overlays.dialog.files_review.title')"
		:ui="{ footer: 'justify-between' }"
		:close="false"
		:dismissible="false"
		fullscreen
	>
		<template #body>
			<UTree v-model:expanded="expanded" :items="treeItems" :get-key="node => node.key" :as="{ link: 'div' }">
				<template #folder-trailing="{ item, expanded: isExpanded }">
					<UIcon :name="isExpanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-right'" class="size-4 shrink-0" />
					<UButton
						v-if="removableFolderKeys.has(item.key)"
						icon="i-tabler-trash"
						color="error"
						variant="ghost"
						size="xs"
						:title="t('overlays.dialog.files_review.remove')"
						@click="removeFolder(item.key)"
					/>
				</template>
				<template #item-trailing="{ item }">
					<div v-if="item.type === 'file'" class="flex items-center gap-2 shrink-0">
						<span v-if="item.action === 'reject_size' || item.action === 'reject_type'" class="text-xs text-muted">
							{{ formatBytes(item.size) }}
						</span>
						<UBadge size="sm" variant="subtle" :color="actionColor(item.action)" :label="actionLabel(item.action)" />
						<UButton
							v-if="item.action !== 'reject_size' && item.action !== 'reject_type'"
							icon="i-tabler-trash"
							color="error"
							variant="ghost"
							size="xs"
							:title="t('overlays.dialog.files_review.remove')"
							@click="removePath(item.key)"
						/>
					</div>
				</template>
			</UTree>
			<p v-if="acceptedCount === 0" class="text-warning text-sm mt-3">
				{{ t('overlays.dialog.files_review.nothing_to_upload') }}
			</p>
		</template>
		<template #footer>
			<div class="flex flex-col items-start gap-1">
				<p v-if="removedFileCount > 0" class="text-warning flex items-center gap-2 text-sm">
					<UIcon name="i-tabler-circle-minus" />
					{{ t('overlays.dialog.files_review.removed_count', { count: removedFileCount }) }}
					<UButton
						:label="t('overlays.dialog.files_review.restore')"
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-tabler-rotate"
						@click="restore"
					/>
				</p>
				<p v-if="ignoredDirsLabel" class="text-muted flex items-center gap-2">
					<UIcon name="i-tabler-folder-off" />
					{{
						t('form.files.ignored_dirs_note', { dirs: ignoredDirsLabel }, { escapeParameter: false })
					}}
				</p>
			</div>
			<div class="flex items-center gap-3">
				<UButton
					:label="t('overlays.dialog.files_review.cancel')"
					color="neutral"
					variant="outline"
					icon="i-tabler-cancel"
					@click="emits('close', { confirm: false, removedPaths: [] })"
				/>
				<UButton
					:label="t('overlays.dialog.files_review.confirm')"
					color="primary"
					icon="i-tabler-upload"
					:disabled="acceptedCount === 0"
					@click="emits('close', { confirm: true, removedPaths: Array.from(removedPaths) })"
				/>
			</div>
		</template>
	</UModal>
</template>
