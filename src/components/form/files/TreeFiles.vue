<script lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
	buildTree,
	byteSize,
	collectFolderKeys,
	getFileIcon,
	type ManagedFile,
	type ManagedTreeNode,
	type TreeFilesConfig,
} from '@/lib/files'
import { formatBytes } from '@/utils/format.ts'
import TreeFilesViewer from '@/components/view/TreeFilesViewer.vue'
import TreeFilePicker from './TreeFilePicker.vue'
import FileContentEditor from './FileContentEditor.vue'
</script>

<script setup lang="ts">
const props = defineProps<{
	class?: string
	modelValue: ManagedFile[]
	config?: TreeFilesConfig
	canUpload?: boolean
	canEdit?: boolean
	canCreateFile?: boolean
	isProtectedFile?: (entry: ManagedFile) => boolean
	onBeforeCreate?: (path: string) => string | undefined
}>()

const emit = defineEmits<{
	'update:modelValue': [files: ManagedFile[]]
}>()

const { t } = useI18n()

const selected = ref<ManagedTreeNode | undefined>(undefined)
const expanded = ref<string[]>([])

const canUpload = computed(() => props.canUpload ?? true)
const canEdit = computed(() => props.canEdit ?? true)
const canCreateFile = computed(() => props.canCreateFile ?? true)

const treeItems = computed(() => buildTree(props.modelValue))

const folderKeys = computed(() => collectFolderKeys(treeItems.value))

watch(
	folderKeys,
	keys => {
		expanded.value = Array.from(new Set([...expanded.value, ...keys]))
	},
	{ immediate: true },
)

const selectedPath = computed(() => (selected.value?.type === 'file' ? selected.value.key : null))

const selectedEntry = computed(() => props.modelValue.find(f => f.file_path === selectedPath.value))

const selectedIsProtected = computed(() =>
	!!selectedPath.value && !!selectedEntry.value && (props.isProtectedFile?.(selectedEntry.value) ?? false),
)

const selectedIcon = computed(() =>
	selectedPath.value && selectedEntry.value
		? getFileIcon(selectedEntry.value)
		: 'i-vscode-icons-file-type-text',
)

const selectedContent = computed({
	get: () => selectedEntry.value?.content ?? '',
	set: (value: string) => {
		if (!selectedPath.value) return
		emit(
			'update:modelValue',
			props.modelValue.map(f =>
				f.file_path === selectedPath.value
					? { ...f, content: value, size: f.is_binary ? f.size : byteSize(value) }
					: f,
			),
		)
	},
})

function updateContent(value: string | null) {
	selectedContent.value = value ?? ''
}

function selectFile(path: string) {
	const name = path.split('/').filter(Boolean).pop() ?? path
	selected.value = { key: path, label: name, type: 'file' }
}

function expandFolder(folderPath: string) {
	if (!expanded.value.includes(folderPath)) expanded.value = [...expanded.value, folderPath]
}

const existingPaths = computed(() => props.modelValue.map(f => f.file_path))

function handleFilesSelected(entries: ManagedFile[]) {
	let next = [...props.modelValue]
	for (const e of entries) {
		const idx = next.findIndex(f => f.file_path === e.file_path)
		if (idx >= 0) {
			next = next.map(f => (f.file_path === e.file_path ? { ...f, ...e, id: f.id } : f))
		} else {
			next = [...next, e]
		}
	}
	emit('update:modelValue', next)
	const last = entries[entries.length - 1]
	if (last) {
		const parts = last.file_path.split('/').filter(Boolean)
		if (parts.length > 1) expandFolder(parts.slice(0, -1).join('/'))
		selectFile(last.file_path)
	}
}

function removeFile(path: string) {
	const entry = props.modelValue.find(f => f.file_path === path)
	if (entry && (props.isProtectedFile?.(entry) ?? false)) return
	emit(
		'update:modelValue',
		props.modelValue.filter(f => f.file_path !== path),
	)
	if (selectedPath.value === path) selected.value = undefined
}

function normalizeName(name: string, folder: string): string {
	let normalized = name
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
	if (folder) {
		const prefix = folder + '/'
		if (normalized.startsWith(prefix)) normalized = normalized.slice(prefix.length)
	}
	return normalized
}

function confirmCreateFile(fileName: string, folder: string): string | undefined {
	if (fileName.length === 0) {
		return t('form.files.create.not_empty')
	}

	const name = normalizeName(fileName, folder)

	if (!name) {
		return t('form.files.invalid_path')
	}
	const path = folder ? `${folder}/${name}` : name

	const validationError = props.onBeforeCreate?.(path)
	if (validationError) return validationError

	if (props.modelValue.some(f => f.file_path === path)) {
		return t('form.files.already_exists')
	}

	emit('update:modelValue', [
		...props.modelValue,
		{
			file_path: path,
			name: name.split('/').pop() ?? name,
			content: '',
			is_binary: false,
			mime_type: 'text/plain',
			size: 0,
			icon: getFileIcon({ name: name.split('/').pop() ?? name, mime_type: 'text/plain', is_binary: false }),
		},
	])

	const parts = path.split('/').filter(Boolean)
	if (parts.length > 1) expandFolder(parts.slice(0, -1).join('/'))
	selectFile(path)

	return
}
</script>

<template>
	<div class="flex flex-col gap-4" :class="props.class">
		<div class="flex items-start gap-4">
			<div class="flex flex-col gap-2 w-xs">
				<TreeFilesViewer
					v-model="selected"
					:items="treeItems"
					:on-create-file="confirmCreateFile"
					:can-create-file="canCreateFile"
				>
					<template #actions>
						<slot name="actions" />
					</template>
					<template #badges="{ item }">
						<slot name="tree-badges" :item="item" />
					</template>
				</TreeFilesViewer>
			</div>

			<div class="flex-1">
				<TreeFilePicker
					v-if="canUpload"
					:existing-paths="existingPaths"
					:config="config"
					@files-selected="handleFilesSelected"
				/>

				<UButton
					v-if="canEdit && selectedPath && selectedEntry && !selectedIsProtected"
					color="error"
					variant="soft"
					size="sm"
					icon="i-tabler-trash"
					:label="t('form.files.delete')"
					class="mt-3"
					@click="removeFile(selectedPath)"
				/>

				<br />

				<div v-if="selectedPath && selectedEntry" class="flex flex-col gap-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 min-w-0">
							<UIcon :name="selectedIcon" class="size-4 text-muted shrink-0" />
							<span class="text-sm font-mono text-foreground truncate">{{ selectedPath }}</span>
							<span v-if="selectedEntry.size" class="text-xs text-muted shrink-0 tabular-nums"
								>({{ formatBytes(selectedEntry.size) }})</span
							>
						</div>
						<div class="flex items-center gap-1.5 shrink-0">
							<slot name="badges" :entry="selectedEntry" />
						</div>
					</div>

					<slot
						v-if="canEdit"
						name="editor"
						:entry="selectedEntry"
						:content="selectedContent"
						:update-content="updateContent"
					>
						<FileContentEditor :entry="selectedEntry" v-model="selectedContent" />
					</slot>
				</div>

				<div
					v-else-if="canEdit && (canUpload || canCreateFile)"
					class="border-2 border-dashed border-muted rounded-lg p-6 text-center text-sm text-muted"
				>
					{{ t('form.files.select_hint') }}
				</div>
			</div>
		</div>
	</div>
</template>
