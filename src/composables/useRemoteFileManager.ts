import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'

import useSshJobs, { isActiveStatus } from '@/composables/useSshJobs'
import type { SshBatchJobMeta, SshJob } from '@/composables/useSshJobs'
import { useFileManagerPersistence } from '@/stores/fileManagerPersistence'
import { useFileManagerPreferences } from '@/stores/useFileManagerPreferences'
import { useFileManagerQueue } from '@/stores/useFileManagerQueue'
import { useRemoteFileMarks } from '@/stores/remoteFileMarks'
import type { RemoteFileMarkSource, FileManagerTransferSnapshot } from '@/types/fileManager'
import type {
	RemoteBatchResult,
	RemoteFileManagerEvent,
	RemoteTransferBatchInput,
} from '@/types/tauri-types'
import type { CommandResponse } from '@/types/tauri-types'

/** Una solicitud de transferencia ya resuelta a rutas concretas. */
export interface FileManagerTransferRequest {
	key: string
	hostId: number
	direction: 'upload' | 'download'
	/** Ruta local: origen al subir, destino al descargar. */
	localPath: string
	/** Ruta remota: destino al subir, origen al descargar. */
	remotePath: string
	label?: string
	dependsOn?: string[]
	overwrite?: boolean
	chmod?: string
	recursive?: boolean
	/** Entrada remota de origen en las descargas, para la marca «descargado». */
	remoteSource?: RemoteFileMarkSource
}

/** Datos que no van en `SshJob` pero sí en el snapshot persistido. */
interface TransferMeta {
	hostId: number
	request: FileManagerTransferRequest
	retryOf: string | null
}

interface FileManagerRuntime {
	ssh: ReturnType<typeof useSshJobs>
	queue: ReturnType<typeof useFileManagerQueue>
	persistence: ReturnType<typeof useFileManagerPersistence>
	preferences: ReturnType<typeof useFileManagerPreferences>
	marks: ReturnType<typeof useRemoteFileMarks>
	sequence: number
	managedKeys: Set<string>
	meta: Map<string, TransferMeta>
	enabledHostIds: Ref<Set<number>>
	hydrated: boolean
	pendingSaves: Map<string, ReturnType<typeof setTimeout>>
}

/** `file_progress` llega muy rápido: se agrupa antes de escribir en SQLite. */
const SAVE_DEBOUNCE_MS = 150

function buildSnapshot(runtime: FileManagerRuntime, job: SshJob): FileManagerTransferSnapshot {
	const meta = runtime.meta.get(job.key)

	return {
		key: job.key,
		label: job.label,
		operation: job.operation,
		status: job.status,
		jobId: job.jobId,
		output: job.output,
		exitCode: job.exitCode,
		errorMessage: job.errorMessage,
		result: job.result,
		finishStatus: job.finishStatus,
		createdAt: job.createdAt,
		startedAt: job.startedAt,
		finishedAt: job.finishedAt,
		bytesTransferred: job.bytesTransferred,
		bytesTotal: job.bytesTotal,
		sourcePath: job.sourcePath,
		targetPath: job.targetPath,
		files: job.files,
		hostId: meta?.hostId ?? 0,
		retryOf: meta?.retryOf ?? null,
		request: meta?.request ?? null,
	}
}

function scheduleSave(runtime: FileManagerRuntime, job: SshJob): void {
	const previous = runtime.pendingSaves.get(job.key)
	if (previous) clearTimeout(previous)

	const transferring = job.files?.some(file => file.status === 'running') ?? false
	const timer = setTimeout(() => {
		runtime.pendingSaves.delete(job.key)
		runtime.queue.save(buildSnapshot(runtime, job))
	}, transferring ? SAVE_DEBOUNCE_MS : 0)
	runtime.pendingSaves.set(job.key, timer)
}

function createRuntime(): FileManagerRuntime {
	const runtime: FileManagerRuntime = {
		ssh: useSshJobs(),
		queue: useFileManagerQueue(),
		persistence: useFileManagerPersistence(),
		preferences: useFileManagerPreferences(),
		marks: useRemoteFileMarks(),
		sequence: 0,
		managedKeys: new Set(),
		meta: new Map(),
		enabledHostIds: ref(new Set<number>()),
		hydrated: false,
		pendingSaves: new Map(),
	}

	watch(
		() => Array.from(runtime.ssh.jobs.values()),
		jobs => {
			for (const job of jobs) {
				if (runtime.managedKeys.has(job.key)) scheduleSave(runtime, job)
			}
		},
		{ deep: true, flush: 'post' },
	)

	return runtime
}

/** Estado compartido: la cola sigue viva aunque la página se desmonte. */
let sharedRuntime: FileManagerRuntime | undefined

/**
 * Fachada del gestor de archivos: convierte selecciones en lotes SSH, persiste
 * la cola en SQLite y ofrece reintento manual. La consola remota usa su propia
 * instancia de `useSshJobs` a través de `useRemoteCommand`.
 */
export default function useRemoteFileManager() {
	const runtime = sharedRuntime ?? (sharedRuntime = createRuntime())
	const { ssh, queue, marks } = runtime

	const jobs = computed(() => ssh.orderedJobs.value)
	const isRunning = computed(() => jobs.value.some(job => isActiveStatus(job.status)))
	const total = computed(() => jobs.value.length)
	const completed = computed(() => jobs.value.filter(job => !isActiveStatus(job.status)).length)
	const bytesTransferred = computed(() =>
		jobs.value.reduce((sum, job) => sum + (job.bytesTransferred ?? 0), 0),
	)

	function nextTransferKey(): string {
		runtime.sequence += 1
		const key = `file-transfer-${Date.now()}-${runtime.sequence}`
		runtime.managedKeys.add(key)
		return key
	}

	async function refreshEnabledHosts(): Promise<void> {
		runtime.enabledHostIds.value = new Set(await runtime.persistence.getEnabledHostIds())
	}

	function register(key: string, meta: TransferMeta): void {
		runtime.managedKeys.add(key)
		runtime.meta.set(key, meta)
	}

	/** Restaura jobs y registra sus metadatos antes de que el observador escriba. */
	async function hydrate(): Promise<void> {
		if (runtime.hydrated) return
		runtime.hydrated = true

		await Promise.all([queue.hydrate(), marks.hydrate(), refreshEnabledHosts()])

		const snapshots = [...queue.transfers]
		for (const snapshot of snapshots) {
			register(snapshot.key, {
				hostId: snapshot.hostId,
				request: snapshot.request ?? requestFromSnapshot(snapshot),
				retryOf: snapshot.retryOf,
			})
		}
		ssh.restoreJobs(snapshots)
	}

	/** Agrupa por host (un lote = una conexión) y devuelve la última respuesta. */
	async function enqueue(
		requests: FileManagerTransferRequest[],
		options: { retryOf?: string | null } = {},
	): Promise<CommandResponse<RemoteBatchResult> | null> {
		if (!requests.length) return null

		const byHost = new Map<number, FileManagerTransferRequest[]>()
		for (const request of requests) {
			register(request.key, {
				hostId: request.hostId,
				request,
				retryOf: options.retryOf ?? null,
			})

			const group = byHost.get(request.hostId) ?? []
			group.push(request)
			byHost.set(request.hostId, group)
		}

		let lastResponse: CommandResponse<RemoteBatchResult> | null = null
		for (const [hostId, hostRequests] of byHost) {
			const sourceByKey = new Map(
				hostRequests
					.filter(request => request.remoteSource)
					.map(request => [request.key, request] as const),
			)

			const input: RemoteTransferBatchInput = {
				host_id: hostId,
				ssh_reconnect_attempts: null,
				max_concurrency: runtime.preferences.maxConcurrency,
				items: hostRequests.map(request => ({
					key: request.key,
					direction: request.direction,
					local_path: request.localPath,
					remote_path: request.remotePath,
					overwrite: request.overwrite ?? true,
					chmod: request.chmod ?? null,
					recursive: request.recursive ?? null,
				})),
			}
			const metas: SshBatchJobMeta[] = hostRequests.map(request => ({
				key: request.key,
				label: request.label,
				dependsOn: request.dependsOn,
			}))

			lastResponse = await ssh.runBatch(input, metas, (event: RemoteFileManagerEvent) => {
				if (event.event !== 'item_finished' || event.status !== 'success') return
				const request = sourceByKey.get(event.key)
				if (request?.remoteSource) marks.markDownloaded(hostId, request.remoteSource)
			})
		}

		return lastResponse
	}

	function requestFromSnapshot(snapshot: FileManagerTransferSnapshot): FileManagerTransferRequest {
		if (snapshot.request) return { ...snapshot.request, key: snapshot.key }

		const upload = snapshot.operation === 'upload'
		return {
			key: snapshot.key,
			hostId: snapshot.hostId,
			direction: upload ? 'upload' : 'download',
			localPath: (upload ? snapshot.sourcePath : snapshot.targetPath) ?? '',
			remotePath: (upload ? snapshot.targetPath : snapshot.sourcePath) ?? '',
			label: snapshot.label,
		}
	}

	/** Acepta una clave de job o un host; la vista usa la clave. */
	function canRetry(target: string | number): boolean {
		const hostId =
			typeof target === 'number' ? target : runtime.meta.get(target)?.hostId
		return hostId !== undefined && runtime.enabledHostIds.value.has(hostId)
	}

	/** Crea un job nuevo y deja el anterior en el historial. */
	async function retry(key: string): Promise<CommandResponse<RemoteBatchResult> | null> {
		const snapshot = queue.get(key)
		if (!snapshot) return null

		await refreshEnabledHosts()
		if (!canRetry(key)) return null

		const request = requestFromSnapshot(snapshot)
		if (!request.localPath || !request.remotePath) return null

		return enqueue([{ ...request, key: nextTransferKey() }], { retryOf: key })
	}

	/** Cancela un ítem y sus dependientes; sin clave cancela el activo, nunca todo. */
	function cancel(key?: string) {
		return ssh.cancel(key)
	}

	function clearFinished() {
		const keys = ssh.orderedJobs.value.filter(job => !isActiveStatus(job.status)).map(job => job.key)
		ssh.clear()
		queue.remove(keys)
		for (const key of keys) {
			const timer = runtime.pendingSaves.get(key)
			if (timer) clearTimeout(timer)
			runtime.pendingSaves.delete(key)
			runtime.meta.delete(key)
			runtime.managedKeys.delete(key)
		}
	}

	function pruneMarks(hostId: number, entries: readonly RemoteFileMarkSource[]) {
		marks.prune(hostId, entries)
	}

	function isDownloaded(hostId: number, source: RemoteFileMarkSource) {
		return marks.isDownloaded(hostId, source)
	}

	return {
		queue: jobs,
		isRunning,
		total,
		completed,
		bytesTransferred,
		hydrate,
		nextTransferKey,
		enqueue,
		canRetry,
		retry,
		cancel,
		clearFinished,
		pruneMarks,
		isDownloaded,
	}
}
