<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SshJob, SshJobFile, SshJobStatus } from '@/composables/useSshJobs'
import type { FileEntry } from '@/types/fileManager'

import { formatBytes } from '@/utils/format'
import { ICONS } from '@/utils/icons'
import FileTree from './FileTree.vue'

const props = defineProps<{
	jobs: SshJob[]
	canRetry: (key: string) => boolean
}>()

const emit = defineEmits<{
	cancel: [key: string]
	retry: [key: string]
	clear: []
}>()

const { t } = useI18n()

const FINISHED: SshJobStatus[] = ['success', 'error', 'cancelled', 'skipped', 'interrupted']
const ACTIVE: SshJobStatus[] = ['pending', 'running']

interface TransferTree {
	entries: FileEntry[]
	childrenByKey: Record<string, FileEntry[]>
	/** Índice por clave de `FileEntry`, para los slots del árbol. */
	filesByKey: Map<string, SshJobFile>
}

const finishedCount = computed(() => props.jobs.filter(job => FINISHED.includes(job.status)).length)
const bytes = computed(() => props.jobs.reduce((sum, job) => sum + (job.bytesTransferred ?? 0), 0))

function keySequence(key: string): number {
	const match = /(\d+)$/.exec(key)
	return match ? Number(match[1]) : 0
}

const orderedJobs = computed(() =>
	[...props.jobs].sort((a, b) => {
		const byDate = b.createdAt.localeCompare(a.createdAt)
		return byDate || keySequence(b.key) - keySequence(a.key)
	}),
)

function isActive(job: SshJob): boolean {
	return ACTIVE.includes(job.status)
}

function statusColor(status: SshJobStatus): 'primary' | 'success' | 'error' | 'warning' | 'neutral' {
	if (status === 'success') return 'success'
	if (status === 'error') return 'error'
	if (status === 'running') return 'primary'
	if (status === 'cancelled' || status === 'skipped' || status === 'interrupted') return 'warning'
	return 'neutral'
}

function filePercent(file: SshJobFile): number {
	if (!file.size) return file.status === 'success' ? 100 : 0
	return Math.min(100, Math.round((file.bytes / file.size) * 100))
}

/** Las rutas llegan con `\` desde Windows local y con `/` desde SFTP. */
function normalizeRelativePath(path: string): string {
	return path
		.replace(/\\/g, '/')
		.split('/')
		.filter(part => part && part !== '.')
		.join('/')
}

function buildTree(job: SshJob): TransferTree {
	const entries: FileEntry[] = []
	const childrenByKey: Record<string, FileEntry[]> = {}
	const filesByKey = new Map<string, SshJobFile>()
	const directories = new Map<string, FileEntry>()
	const fileList = job.files ?? []

	for (const file of fileList) {
		const relative = normalizeRelativePath(file.relativePath || file.path)
		const parts = relative.split('/')
		for (let index = 1; index < parts.length; index += 1) {
			const path = parts.slice(0, index).join('/')
			if (directories.has(path)) continue
			directories.set(path, {
				key: `${job.key}:dir:${path}`,
				path,
				name: parts[index - 1]!,
				kind: 'dir',
				size: 0,
				modified: null,
				permissions: null,
				target: null,
			})
		}
	}

	for (const [path, directory] of directories) {
		const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
		const siblings = parent ? (childrenByKey[`${job.key}:dir:${parent}`] ??= []) : entries
		if (!siblings.some(entry => entry.key === directory.key)) siblings.push(directory)
	}

	for (const file of fileList) {
		const relative = normalizeRelativePath(file.relativePath || file.path)
		if (!relative || relative === '/') continue
		const parts = relative.split('/')
		const entry: FileEntry = {
			key: `${job.key}:file:${relative}`,
			path: relative,
			name: parts[parts.length - 1]!,
			kind: 'file',
			size: file.size,
			modified: null,
			permissions: null,
			target: null,
		}
		filesByKey.set(entry.key, file)

		const parent = parts.slice(0, -1).join('/')
		const siblings = parent ? (childrenByKey[`${job.key}:dir:${parent}`] ??= []) : entries
		if (!siblings.some(item => item.key === entry.key)) siblings.push(entry)
	}

	return { entries, childrenByKey, filesByKey }
}

const trees = computed(() => new Map(orderedJobs.value.map(job => [job.key, buildTree(job)])))

function fileFor(job: SshJob, entry: FileEntry): SshJobFile | undefined {
	return trees.value.get(job.key)?.filesByKey.get(entry.key)
}
</script>

<template>
	<section class="flex flex-col h-full min-h-0 rounded-lg border border-default bg-default/30">
		<header class="flex items-center justify-between gap-2 p-3 border-b border-default">
			<div class="flex items-center gap-2 font-medium">
				<UIcon :name="ICONS.status.infoCircle" class="size-4" />
				{{ t('components.file_manager.queue.title') }}
			</div>
			<UButton
				:icon="ICONS.actions.trash"
				:label="t('components.file_manager.queue.clear')"
				color="neutral"
				variant="ghost"
				size="xs"
				:disabled="!finishedCount"
				@click="emit('clear')"
			/>
		</header>

		<p class="px-3 pt-2 text-xs text-muted">
			{{
				t('components.file_manager.queue.summary', {
					completed: finishedCount,
					total: jobs.length,
					bytes: formatBytes(bytes),
				})
			}}
		</p>

		<div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
			<p v-if="!orderedJobs.length" class="text-sm text-muted p-3">
				{{ t('components.file_manager.queue.empty') }}
			</p>

			<article v-for="job in orderedJobs" :key="job.key" class="rounded-md border border-default p-3 text-xs">
				<header class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-2 flex-wrap min-w-0">
						<UIcon
							:name="job.operation === 'upload' ? ICONS.taskType.upload_file : ICONS.taskType.download_file"
							class="size-4 shrink-0"
						/>
						<span class="font-medium">
							{{ t(`components.file_manager.direction.${job.operation}`) }}
						</span>
						<UBadge :color="statusColor(job.status)" variant="subtle" size="xs">
							{{ t(`components.file_manager.status.${job.status}`) }}
						</UBadge>
						<span v-if="job.bytesTransferred != null" class="tabular-nums text-muted">
							{{ formatBytes(job.bytesTransferred) }}
						</span>
					</div>
					<div class="flex items-center gap-1 shrink-0">
						<UButton
							v-if="isActive(job)"
							:icon="ICONS.actions.cancel"
							:title="t('components.file_manager.queue.cancel')"
							color="neutral"
							variant="ghost"
							size="xs"
							@click="emit('cancel', job.key)"
						/>
						<span
							:title="
								canRetry(job.key)
									? t('components.file_manager.queue.retry')
									: t('components.file_manager.queue.retry_unavailable')
							"
						>
							<UButton
								:icon="ICONS.actions.reset"
								:label="t('components.file_manager.queue.retry')"
								color="neutral"
								variant="ghost"
								size="xs"
								:disabled="!canRetry(job.key)"
								@click="emit('retry', job.key)"
							/>
						</span>
					</div>
				</header>

				<div class="flex flex-col @3xl:flex-row items-center gap-2 mt-1">
					<div class="truncate text-muted" :title="job.sourcePath">{{ job.sourcePath }}</div>
					<span class="flex-none">
						<UIcon :name="ICONS.actions.arrowNarrowDownDashed" class="@3xl:hidden" />
						<UIcon :name="ICONS.actions.arrowNarrowRightDashed" class="hidden @3xl:block" />
					</span>
					<div class="truncate text-muted" :title="job.targetPath">{{ job.targetPath }}</div>
				</div>
				<p v-if="job.errorMessage" class="mt-1 text-error wrap-break-word">{{ job.errorMessage }}</p>

				<div v-if="trees.get(job.key)?.entries.length" class="mt-2 border-t border-default pt-2">
					<p class="mb-1 text-xs text-muted">
						{{ t('components.file_manager.queue.files', { count: job.files?.length ?? 0 }) }}
					</p>
					<FileTree
						:entries="trees.get(job.key)!.entries"
						:children-by-key="trees.get(job.key)!.childrenByKey"
						:empty-label="t('components.file_manager.queue.no_files')"
						read-only
						always-expanded
					>
						<template #node-leading-info="{ entry }">
							<span
								v-if="fileFor(job, entry as FileEntry)"
								class="flex items-center gap-1.5 shrink-0 text-xs text-muted"
							>
								<span class="tabular-nums">
									{{ formatBytes(fileFor(job, entry as FileEntry)!.bytes) }} /
									{{ formatBytes(fileFor(job, entry as FileEntry)!.size) }}
								</span>
								<span class="tabular-nums">{{ filePercent(fileFor(job, entry as FileEntry)!) }}%</span>
								<UBadge :color="statusColor(fileFor(job, entry as FileEntry)!.status)" variant="subtle" size="xs">
									{{ t(`components.file_manager.status.${fileFor(job, entry as FileEntry)!.status}`) }}
								</UBadge>
							</span>
						</template>

						<template #node-details="{ entry }">
							<template v-if="fileFor(job, entry as FileEntry)">
								<div class="h-1 w-full overflow-hidden rounded-full bg-default/60">
									<div
										class="h-full rounded-full bg-primary transition-all"
										:style="{ width: `${filePercent(fileFor(job, entry as FileEntry)!)}%` }"
									/>
								</div>
								<p v-if="fileFor(job, entry as FileEntry)!.messageKey" class="mt-1 text-error">
									{{ t(fileFor(job, entry as FileEntry)!.messageKey!) }}
								</p>
							</template>
						</template>
					</FileTree>
				</div>
			</article>
		</div>
	</section>
</template>
