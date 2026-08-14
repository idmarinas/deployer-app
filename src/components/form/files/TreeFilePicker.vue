<script lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useReviewFilesDialog } from '@/composables/useDialog'
import {
	buildManagedFile,
	detectBinary,
	EXCLUDED_EXTENSIONS,
	getUploadRelativePath,
	IGNORED_DIRS,
	MAX_FILE_SIZE,
	type ManagedFile,
	type TreeFilesConfig,
} from '@/lib/files'
</script>

<script setup lang="ts">
const props = defineProps<{
	existingPaths: string[]
	config?: TreeFilesConfig
}>()

const emit = defineEmits<{
	'files-selected': [files: ManagedFile[]]
}>()

const { t } = useI18n()

const isDragOver = ref(false)
const selectedFiles = ref<File[]>([])
const isLoading = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const folderInputRef = ref<HTMLInputElement>()

const reviewFiles = useReviewFilesDialog()

const excludedExtensions = computed(() =>
	new Set((props.config?.excludedExtensions ?? [...EXCLUDED_EXTENSIONS]).map(e => e.toLowerCase())),
)
const ignoredDirs = computed(() =>
	new Set((props.config?.ignoredDirs ?? [...IGNORED_DIRS]).map(d => d.toLowerCase())),
)
const maxFileSize = computed(() => props.config?.maxFileSize ?? MAX_FILE_SIZE)

function isExcludedType(path: string): boolean {
	const lower = path.toLowerCase()
	const dot = lower.lastIndexOf('.')
	if (dot < 0 || dot === lower.length - 1) return false
	return excludedExtensions.value.has(lower.slice(dot + 1))
}

function isIgnoredDir(path: string): boolean {
	const segments = path.split('/').filter(Boolean)
	return segments.some(segment => ignoredDirs.value.has(segment.toLowerCase()))
}

const entries = computed(() => {
	return selectedFiles.value.map(file => {
		const path = getUploadRelativePath(file)
		return {
			file,
			path,
			isExcludedType: isExcludedType(path),
			isIgnoredDir: isIgnoredDir(path),
		}
	})
})

const acceptedEntries = computed(() =>
	entries.value.filter(e => e.file.size <= maxFileSize.value && !e.isExcludedType && !e.isIgnoredDir),
)

const discardedFilesCount = computed(() => entries.value.length - acceptedEntries.value.length)

const reviewItems = computed(() => {
	const items = entries.value
		.filter(e => !e.isIgnoredDir)
		.map(e => ({
			path: e.path,
			file: e.file,
			size: e.file.size,
			icon: buildManagedFile(e.file).icon ?? undefined,
			reason: e.isExcludedType ? ('type' as const) : e.file.size > maxFileSize.value ? ('size' as const) : null,
		}))

	return items
})

function handleDragOver(event: DragEvent) {
	event.preventDefault()
	isDragOver.value = true
}

function handleDragLeave() {
	isDragOver.value = false
}

function handleDrop(event: DragEvent) {
	event.preventDefault()
	isDragOver.value = false
	selectedFiles.value = (event.dataTransfer?.files ?? []) as File[]
}

function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement
	selectedFiles.value = Array.from(target.files || [])
}

function handleFolderSelect(event: Event) {
	const target = event.target as HTMLInputElement

	selectedFiles.value = Array.from(target.files || []).filter(file => {
		return ![...ignoredDirs.value].some(dir => file.webkitRelativePath.includes(`/${dir}/`))
	})
}

function resetInputs() {
	if (fileInputRef.value) fileInputRef.value.value = ''
	if (folderInputRef.value) folderInputRef.value.value = ''
}

function clearFiles() {
	selectedFiles.value = []
	resetInputs()
}

function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const dataUrl = String(reader.result)
			const comma = dataUrl.indexOf(',')
			resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
		}
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

async function readFile(file: File): Promise<{ content: string | null; is_binary: boolean }> {
	if (detectBinary(file)) {
		try {
			const content = await readFileAsBase64(file)
			return { content, is_binary: true }
		} catch {
			return { content: null, is_binary: true }
		}
	}
	try {
		const content = await file.text()
		return { content, is_binary: false }
	} catch {
		return { content: null, is_binary: true }
	}
}

async function applyFiles(removedPaths: string[] = []) {
	isLoading.value = true
	const isRemoved = (path: string) => removedPaths.some(p => path === p || path.startsWith(p + '/'))
	const accepted = acceptedEntries.value.filter(e => !isRemoved(e.path))
	const results = await Promise.all(accepted.map(e => readFile(e.file)))
	const payload: ManagedFile[] = accepted.map((e, i) => ({
		...buildManagedFile(e.file),
		content: results[i].content,
		is_binary: results[i].is_binary,
	}))
	emit('files-selected', payload)
	isLoading.value = false
	clearFiles()
}

async function reviewFilesDialog() {
	const result = await reviewFiles({
		items: reviewItems.value,
		existingPaths: props.existingPaths,
		ignoredDirs: props.config?.ignoredDirs ?? [...IGNORED_DIRS],
	})
	if (!result.confirm) return
	await applyFiles(result.removedPaths)
}
</script>

<template>
	<div
		class="transition-colors"
		:class="isDragOver ? 'border-primary bg-primary/5' : 'border-muted'"
		@dragover="handleDragOver"
		@dragleave="handleDragLeave"
		@drop="handleDrop"
	>
		<div v-if="selectedFiles.length === 0" class="flex items-center justify-between gap-3">
			<p class="text-muted flex items-center gap-2">
				<UIcon name="i-tabler-cloud-upload" />
				{{ t('form.files.upload') }}
			</p>
			<div class="flex gap-2">
				<UButton
					:label="t('form.files.upload')"
					variant="outline"
					size="xs"
					@click="fileInputRef?.click()"
				/>
				<UButton
					:label="t('form.files.upload_folder')"
					variant="outline"
					size="xs"
					@click="folderInputRef?.click()"
				/>
			</div>
			<input ref="fileInputRef" type="file" class="hidden" multiple @change="handleFileSelect" />
			<input ref="folderInputRef" type="file" class="hidden" webkitdirectory multiple @change="handleFolderSelect" />
		</div>

		<div v-else class="flex flex-col gap-2">
			<div class="flex items-center justify-between gap-3">
				<p class="flex items-center gap-2">
					<UIcon
						:name="isLoading ? 'i-tabler-loader-2' : 'i-tabler-file-check'"
						class="text-success"
						:class="isLoading ? 'animate-spin' : ''"
					/>
					{{ t('form.files.file_count', { count: acceptedEntries.length }) }}
				</p>

				<p v-if="discardedFilesCount > 0" class="text-warning flex items-center gap-2 text-sm">
					<UIcon name="i-tabler-alert-triangle" />
					{{ t('form.files.discarded_files', { count: discardedFilesCount }) }}
				</p>
				<div class="flex gap-2">
					<UButton
						:label="t('form.files.review')"
						size="xs"
						color="success"
						:loading="isLoading"
						:disabled="reviewItems.length === 0"
						@click="reviewFilesDialog"
					/>
					<UButton
						:label="t('form.files.cancel')"
						variant="outline"
						size="xs"
						:disabled="isLoading"
						@click="clearFiles"
					/>
				</div>
			</div>
		</div>
	</div>
</template>
