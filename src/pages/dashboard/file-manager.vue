<script lang="ts">
import type { SshJob, SshJobStatus } from '@/composables/useSshJobs'
import type { FileManagerTab } from '@/stores/useFileManagerPreferences'
import type { FileEntry } from '@/types/fileManager'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import useRemoteFileManager from '@/composables/useRemoteFileManager'
import { useFileManagerListings } from '@/stores/useFileManagerListings'
import { useFileManagerPreferences } from '@/stores/useFileManagerPreferences'

import { formatBytes } from '@/utils/format'
import { ICONS } from '@/utils/icons'
import { joinRemotePath, topLevelEntries } from '@/utils/paths'
</script>

<script setup lang="ts">
definePage({
	name: 'dashboard-file-manager',
})

// Nombre estable para que el `<KeepAlive>` del layout del dashboard conserve esta página.
defineOptions({ name: 'FileManagerPage' })

const manager = useRemoteFileManager()
const queue = manager.queue
const preferences = useFileManagerPreferences()
const listings = useFileManagerListings()
const { t } = useI18n()

// Estado de navegación: sobrevive al desmonte de la página y al reinicio de la app.
const tab = computed<FileManagerTab>({
	get: () => preferences.tab,
	set: value => preferences.setTab(value),
})
const hostId = computed<number | undefined>({
	get: () => preferences.hostId,
	set: value => preferences.setHostId(value),
})
const localPath = computed(() => preferences.localPath)
const remotePath = computed(() => preferences.getRemotePath(hostId.value))
const initialLocalPath = computed(() => preferences.localPath)
const initialRemotePath = computed(() => preferences.getRemotePath(hostId.value))
const localSelection = ref<FileEntry[]>([])
const remoteSelection = ref<FileEntry[]>([])
// El árbol propaga la selección a los descendientes: solo se transferencia la
// entrada superior, que ya incluye todo su contenido.
const uploadEntries = computed(() => topLevelEntries(localSelection.value))
const downloadEntries = computed(() => topLevelEntries(remoteSelection.value))
const maxConcurrency = computed<number | undefined>({
	get: () => preferences.maxConcurrency,
	set: value => preferences.setMaxConcurrency(value ?? 2),
})

onMounted(async () => {
	await Promise.all([preferences.hydrate(), manager.hydrate()])
	// Los listados de hosts borrados/deshabilitados no se reutilizan nunca.
	await listings.purgeOrphans()
})

const canUpload = () => uploadEntries.value.length > 0 && !!hostId.value && !!remotePath.value
const canDownload = () => downloadEntries.value.length > 0 && !!hostId.value && !!localPath.value

/** Un job puede afectar a ambos paneles: se indexa por origen y por destino. */
const jobByPath = computed<Map<string, SshJob>>(() => {
	const map = new Map<string, SshJob>()
	for (const job of manager.queue.value) {
		if (job.sourcePath) map.set(job.sourcePath, job)
		if (job.targetPath && !map.has(job.targetPath)) map.set(job.targetPath, job)
	}
	return map
})

function jobFor(entry: FileEntry): SshJob | undefined {
	return jobByPath.value.get(entry.path)
}

function isActive(status: SshJobStatus): boolean {
	return status === 'running' || status === 'pending'
}

function statusColor(status: SshJobStatus): 'primary' | 'success' | 'error' | 'warning' | 'neutral' {
	if (status === 'success') return 'success'
	if (status === 'error') return 'error'
	if (status === 'running') return 'primary'
	if (status === 'cancelled' || status === 'skipped' || status === 'interrupted') return 'warning'
	return 'neutral'
}

function isDownloaded(entry: FileEntry): boolean {
	return !!hostId.value && manager.isDownloaded(hostId.value, entry)
}

function joinLocal(base: string, name: string): string {
	const separator = base.includes('\\') && !base.includes('/') ? '\\' : '/'
	return `${base.replace(/[\\/]+$/, '')}${separator}${name}`
}

function upload() {
	if (!canUpload() || !hostId.value) return

	void manager.enqueue(
		uploadEntries.value.map(entry => ({
			key: manager.nextTransferKey(),
			hostId: hostId.value!,
			direction: 'upload' as const,
			localPath: entry.path,
			remotePath: joinRemotePath(remotePath.value, entry.name),
			label: entry.name,
		})),
	)
}

function download() {
	if (!canDownload() || !hostId.value) return

	void manager.enqueue(
		downloadEntries.value.map(entry => ({
			key: manager.nextTransferKey(),
			hostId: hostId.value!,
			direction: 'download' as const,
			remotePath: entry.path,
			localPath: joinLocal(localPath.value, entry.name),
			label: entry.name,
			remoteSource: { path: entry.path, size: entry.size, modified: entry.modified },
		})),
	)
}

function setLocalPath(path: string) {
	preferences.setLocalPath(path)
}

function setRemotePath(path: string) {
	if (hostId.value) preferences.setRemotePath(hostId.value, path)
}

function setLocalSelection(entries: FileEntry[]) {
	localSelection.value = entries
}

function setRemoteSelection(entries: FileEntry[]) {
	remoteSelection.value = entries
}

function onRemoteListed(entries: FileEntry[]) {
	if (hostId.value) manager.pruneMarks(hostId.value, entries)
}
</script>

<template>
	<UDashboardPanel id="file-manager">
		<template #header>
			<UDashboardNavbar :icon="ICONS.actions.folderOpen" :title="t('pages.file_manager.title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col h-full min-h-0 p-4">
				<UTabs
					v-model="tab"
					:content="false"
					:items="[
						{
							label: t('pages.file_manager.tabs.files'),
							icon: ICONS.actions.folderOpen,
							value: 'files',
						},
						{
							label: t('pages.file_manager.tabs.transfers'),
							icon: ICONS.status.infoCircle,
							value: 'transfers',
						},
					]"
				/>

				<div v-if="tab === 'files'" class="flex flex-col gap-4 flex-1 min-h-0 pt-4">
					<div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
						<FileManagerPanel
							origin="local"
							:initial-path="initialLocalPath"
							@update:path="setLocalPath"
							@update:selected="setLocalSelection"
						>
							<template #node-status="{ entry }">
								<UBadge
									v-if="jobFor(entry as FileEntry)"
									:color="statusColor(jobFor(entry as FileEntry)!.status)"
									variant="subtle"
									size="xs"
								>
									{{ t(`components.file_manager.status.${jobFor(entry as FileEntry)!.status}`) }}
								</UBadge>
							</template>
							<template #node-progress="{ entry }">
								<span v-if="jobFor(entry as FileEntry)?.bytesTransferred != null" class="text-muted">
									{{ formatBytes(jobFor(entry as FileEntry)!.bytesTransferred ?? 0) }}
								</span>
							</template>
							<template #node-actions="{ entry }">
								<UButton
									v-if="isActive(jobFor(entry as FileEntry)?.status ?? 'success') && jobFor(entry as FileEntry)"
									:icon="ICONS.actions.cancel"
									:title="t('components.file_manager.queue.cancel')"
									color="neutral"
									variant="ghost"
									size="xs"
									@click.stop="manager.cancel(jobFor(entry as FileEntry)!.key)"
								/>
							</template>
						</FileManagerPanel>

						<FileManagerPanel
							origin="remote"
							:host-id="hostId"
							:initial-path="initialRemotePath"
							@update:path="setRemotePath"
							@update:selected="setRemoteSelection"
							@list-loaded="onRemoteListed"
						>
							<template #header-actions>
								<SelectHost v-model="hostId" only-enabled variant="ghost" class="w-full" />
							</template>
							<template #node-status="{ entry }">
								<UBadge v-if="isDownloaded(entry as FileEntry)" color="success" variant="subtle" size="xs">
									{{ t('components.file_manager.mark.downloaded') }}
								</UBadge>
								<UBadge
									v-if="jobFor(entry as FileEntry)"
									:color="statusColor(jobFor(entry as FileEntry)!.status)"
									variant="subtle"
									size="xs"
								>
									{{ t(`components.file_manager.status.${jobFor(entry as FileEntry)!.status}`) }}
								</UBadge>
							</template>
							<template #node-progress="{ entry }">
								<span v-if="jobFor(entry as FileEntry)?.bytesTransferred != null" class="text-muted">
									{{ formatBytes(jobFor(entry as FileEntry)!.bytesTransferred ?? 0) }}
								</span>
							</template>
							<template #node-actions="{ entry }">
								<UButton
									v-if="isActive(jobFor(entry as FileEntry)?.status ?? 'success') && jobFor(entry as FileEntry)"
									:icon="ICONS.actions.cancel"
									:title="t('components.file_manager.queue.cancel')"
									color="neutral"
									variant="ghost"
									size="xs"
									@click.stop="manager.cancel(jobFor(entry as FileEntry)!.key)"
								/>
							</template>
						</FileManagerPanel>
					</div>

					<div class="flex items-center justify-center gap-3">
						<UButton
							:icon="ICONS.actions.arrowRight"
							:label="t('pages.file_manager.actions.upload')"
							color="primary"
							:disabled="!canUpload()"
							:title="t('pages.file_manager.actions.upload_hint')"
							@click="upload"
						/>
						<UButton
							:icon="ICONS.actions.arrowLeft"
							:label="t('pages.file_manager.actions.download')"
							color="neutral"
							variant="outline"
							:disabled="!canDownload()"
							:title="t('pages.file_manager.actions.download_hint')"
							@click="download"
						/>
					</div>
				</div>

				<div v-else class="flex flex-col flex-1 min-h-0 pt-4 gap-2">
					<div class="flex items-center justify-between gap-3">
						<p class="text-xs text-muted">
							{{ t('components.file_manager.queue.concurrency', { count: preferences.maxConcurrency }) }}
						</p>
						<UInputNumber
							v-model="maxConcurrency"
							:min="1"
							:max="16"
							:step="1"
							size="xs"
							class="w-24 shrink-0"
							:aria-label="t('components.file_manager.queue.concurrency_label')"
						/>
					</div>
					<TransferQueue
						:jobs="queue"
						:can-retry="manager.canRetry"
						@cancel="manager.cancel"
						@retry="manager.retry"
						@clear="manager.clearFinished"
					/>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
