import { Channel, invoke } from '@tauri-apps/api/core'
import type {
	CommandResponse,
	RemoteBatchResult,
	RemoteCommandInput,
	RemoteCommandResult,
	RemoteConsoleEvent,
	RemoteDownloadInput,
	RemoteDownloadResult,
	RemoteFileManagerEvent,
	RemoteFinishStatus,
	RemoteTransferFileInfo,
	RemoteTransferBatchInput,
	RemoteTransferItemResult,
	RemoteTransferResult,
	RemoteUploadInput,
} from '@/types/tauri-types'
import { computed, reactive, ref } from 'vue'

import type { FileManagerTransferSnapshot } from '@/types/fileManager'

import { loadGlobalScopeForExecution } from '@/drizzle/lib/variables'
import { i18n } from '@/i18n'
import {
	collectSecretValues,
	InterpolationError,
	interpolateString,
	redactSecrets,
} from '@/utils/interpolation'
import type { InterpolationRoots } from '@/utils/interpolation'

/** Operación SSH disponible en el composable. */
export type SshOperation = 'execute' | 'upload' | 'download'

/** Estado de un trabajo, incluidos los estados previos y los derivados de dependencias. */
export type SshJobStatus =
	| 'pending'
	| 'running'
	| 'success'
	| 'error'
	| 'cancelled'
	| 'skipped'
	| 'interrupted'

/** Estado de un archivo dentro del detalle de un ítem del gestor de archivos. */
export interface SshJobFile {
	id: string
	path: string
	relativePath: string
	size: number
	bytes: number
	status: SshJobStatus
	messageKey?: string | null
}

/** Registro de un trabajo SSH. `key` es la clave de cliente, no el `job_id` de Rust. */
export interface SshJob<TResult = unknown> {
	key: string
	label?: string
	operation: SshOperation
	dependsOn: string[]
	status: SshJobStatus
	/** `job_id` recibido en el evento `started` del backend. */
	jobId: number | null
	output: string
	exitCode: number | null
	errorMessage: string
	result: CommandResponse<TResult> | null
	finishStatus: RemoteFinishStatus | null
	/** ISO al crear el job; permite ordenar la cola aunque esté `pending`. */
	createdAt: string
	startedAt: number | null
	finishedAt: number | null
	/** Bytes del ítem al completarse dentro de un lote; null en otros jobs. */
	bytesTransferred?: number | null
	/** Bytes acumulados del lote cuando terminó el ítem. */
	bytesTotal?: number | null
	/** Rutas origen/destino del ítem en el lote del gestor de archivos. */
	sourcePath?: string
	targetPath?: string
	/** Detalle recursivo del ítem, disponible desde el evento `file_list`. */
	files?: SshJobFile[]
}

/** Metadatos opcionales al lanzar un trabajo. */
export interface SshJobRunOptions {
	/** Clave de cliente; si se omite se genera una. */
	key?: string
	label?: string
	/** Claves de los trabajos de los que depende este. */
	dependsOn?: string[]
}

/**
 * Adaptador de interpolación configurable. La consola usa el ámbito `global`;
 * otros consumidores (p. ej. Nodes Workflow) pueden aportar `params`, `nodes`…
 */
export interface SshInterpolationAdapter {
	getRoots: () => Promise<InterpolationRoots>
	getSecrets: (roots: InterpolationRoots) => readonly string[]
	interpolate: (value: string, roots: InterpolationRoots) => string
	describeError: (error: unknown, roots: InterpolationRoots) => string
}

export interface UseSshJobsOptions {
	interpolator?: SshInterpolationAdapter
}

/** Metadatos de UI de un ítem del lote del gestor de archivos. */
export interface SshBatchJobMeta {
	key: string
	label?: string
	dependsOn?: string[]
}

const defaultInterpolator: SshInterpolationAdapter = {
	async getRoots() {
		return { global: await loadGlobalScopeForExecution() }
	},
	getSecrets: roots => collectSecretValues(roots),
	interpolate: (value, roots) => interpolateString(value, roots, { maskSecrets: false }),
	describeError: error => {
		if (error instanceof InterpolationError) {
			return i18n.global.t(error.messageKey, error.messageParams)
		}

		return String(error)
	},
}

function statusFromFinish(status: RemoteFinishStatus): SshJobStatus {
	return status === 'success' ? 'success' : status
}

/** Aísla la comparación del flujo de TS: el channel muta `status` en un callback. */
export function isActiveStatus(status: SshJobStatus): boolean {
	return status === 'running' || status === 'pending'
}

/** Secuencia final de la clave, usada para desempatar el orden de la cola. */
function keySequence(key: string): number {
	const match = /(\d+)$/.exec(key)
	return match ? Number(match[1]) : 0
}

const DEPENDENCY_POLL_MS = 25

/**
 * Motor reutilizable de operaciones SSH: registro multi-job, todas las opciones
 * de los inputs, interpolación configurable y cancelación selectiva/en cascada.
 *
 * No está acoplado a la consola: la fachada `useRemoteCommand` expone el estado
 * agregado que consumen los componentes actuales.
 */
export default function useSshJobs(options: UseSshJobsOptions = {}) {
	const interpolator = options.interpolator ?? defaultInterpolator
	const jobs = reactive(new Map<string, SshJob>())
	const activeKey = ref<string | null>(null)
	/** Salida escrita explícitamente (mensajes de la UI, no del channel). */
	const extraOutput = ref('')
	let sequence = 0

	function nextKey(): string {
		sequence += 1
		return `ssh-job-${sequence}`
	}

	const orderedJobs = computed(() =>
		Array.from(jobs.values()).sort((a, b) => {
			const byDate = b.createdAt.localeCompare(a.createdAt)
			return byDate || keySequence(b.key) - keySequence(a.key)
		}),
	)
	const activeJob = computed(() => (activeKey.value ? jobs.get(activeKey.value) : undefined))

	/** Estado agregado para consumidores con una sola operación visible (consola). */
	const output = computed(() => {
		const fromJobs = orderedJobs.value.map(job => job.output).filter(Boolean).join('')
		return `${extraOutput.value}${fromJobs}`
	})
	const isRunning = computed(() => orderedJobs.value.some(job => isActiveStatus(job.status)))
	const lastExitCode = computed(() => {
		for (let index = orderedJobs.value.length - 1; index >= 0; index -= 1) {
			const job = orderedJobs.value[index]!
			if (job.finishStatus !== null) return job.exitCode
		}

		return null
	})
	const errorMessage = computed(() => {
		for (let index = orderedJobs.value.length - 1; index >= 0; index -= 1) {
			const job = orderedJobs.value[index]!
			if (job.errorMessage) return job.errorMessage
		}

		return ''
	})
	const currentJobId = computed(() => activeJob.value?.jobId ?? null)
	const lastFinishStatus = computed(() => activeJob.value?.finishStatus ?? null)
	const lastStatus = computed(() => activeJob.value?.status ?? null)

	function appendOutput(text: string) {
		extraOutput.value += text
	}

	function clear(key?: string) {
		if (key) {
			jobs.delete(key)
			if (activeKey.value === key) activeKey.value = null
			return
		}

		extraOutput.value = ''
		for (const [jobKey, job] of jobs) {
			if (!isActiveStatus(job.status)) jobs.delete(jobKey)
		}
		if (activeKey.value && !jobs.has(activeKey.value)) activeKey.value = null
	}

	async function waitForDependencies(job: SshJob): Promise<boolean> {
		if (job.dependsOn.length === 0) return true

		while (job.status !== 'skipped') {
			const blocked = job.dependsOn
				.map(key => jobs.get(key))
				.some(dep => dep && isActiveStatus(dep.status))

			if (!blocked) {
				const ready = job.dependsOn.every(key => jobs.get(key)?.status === 'success')
				if (!ready) job.status = 'skipped'
				return ready
			}

			await new Promise(resolve => setTimeout(resolve, DEPENDENCY_POLL_MS))
		}

		return false
	}

	async function invokeCancel(jobId?: number) {
		try {
			await invoke('ssh_cancel_remote_job', jobId === undefined ? {} : { jobId })
		} catch {
			// Best-effort: el estado real llega por el channel de la operación.
		}
	}

	/** Descendientes del trabajo indicado, incluido él mismo (sin ciclos). */
	function collectDependents(rootKey: string): string[] {
		const result = [rootKey]
		const visited = new Set(result)

		for (let index = 0; index < result.length; index += 1) {
			for (const job of jobs.values()) {
				if (job.dependsOn.includes(result[index]!) && !visited.has(job.key)) {
					visited.add(job.key)
					result.push(job.key)
				}
			}
		}

		return result
	}

	async function cancel(key?: string, options: { cascade?: boolean } = {}) {
		const cascade = options.cascade ?? true
		const targetKey =
			key ??
			activeKey.value ?? orderedJobs.value.find(job => isActiveStatus(job.status))?.key

		if (!targetKey) {
			// Compatibilidad de consola: sin trabajo conocido, Rust cancela el último.
			await invokeCancel()
			return
		}

		for (const jobKey of cascade ? collectDependents(targetKey) : [targetKey]) {
			const job = jobs.get(jobKey)
			if (!job) continue

			if (job.status === 'pending') {
				// En un lote el token ya está registrado aunque el ítem no haya empezado.
				if (job.jobId !== null) await invokeCancel(job.jobId)
				job.status = 'skipped'
			} else if (job.status === 'running') {
				await invokeCancel(job.jobId ?? undefined)
			}
		}
	}

	async function cancelAll() {
		for (const job of orderedJobs.value) {
			if (isActiveStatus(job.status)) {
				await cancel(job.key, { cascade: false })
			}
		}
	}

	async function run<T>(
		operation: SshOperation,
		commandName: string,
		input: unknown,
		meta: SshJobRunOptions = {},
		prepareInput?: (roots: InterpolationRoots, secrets: readonly string[]) => unknown,
	): Promise<CommandResponse<T> | null> {
		const key = meta.key ?? nextKey()
		// Debe ser reactivo por sí mismo: `reactive(Map)` devuelve un proxy en
		// `get()`/iteración, pero mutar el objeto crudo guardado no notifica.
		const job = reactive<SshJob<T>>({
			key,
			label: meta.label,
			operation,
			dependsOn: [...(meta.dependsOn ?? [])],
			status: 'pending',
			jobId: null,
			output: '',
			exitCode: null,
			errorMessage: '',
			result: null,
			finishStatus: null,
			createdAt: new Date().toISOString(),
			startedAt: null,
			finishedAt: null,
		})
		jobs.set(key, job as SshJob)
		activeKey.value = key

		if (!(await waitForDependencies(job))) return null

		let roots: InterpolationRoots = {}
		let secrets: readonly string[] = []
		let finalInput = input

		if (prepareInput) {
			try {
				roots = await interpolator.getRoots()
				secrets = interpolator.getSecrets(roots)
				finalInput = prepareInput(roots, secrets)
			} catch (error) {
				job.status = 'error'
				job.errorMessage = redactSecrets(interpolator.describeError(error, roots), secrets)
				return null
			}
		}

		job.status = 'running'
		job.startedAt = Date.now()

		const channel = new Channel<RemoteConsoleEvent>()
		channel.onmessage = (event: RemoteConsoleEvent) => {
			switch (event.event) {
				case 'started':
					job.jobId = event.job_id
					break
				case 'output_chunk':
					job.output += redactSecrets(event.chunk, secrets)
					break
				case 'finished':
					job.finishStatus = event.status
					job.status = statusFromFinish(event.status)
					job.exitCode = event.exit_code
					job.finishedAt = Date.now()
					if (event.status !== 'success' && event.message && !job.errorMessage) {
						job.errorMessage = redactSecrets(event.message, secrets)
					}
					break
				case 'error':
					if (!job.errorMessage) {
						job.errorMessage = redactSecrets(event.message, secrets)
					}
					break
			}
		}

		try {
			const response = await invoke<CommandResponse<T>>(commandName, { input: finalInput, channel })
			// `reactive` envuelve `data` en UnwrapRef; el valor en runtime es el mismo.
			;(job as unknown as SshJob<T>).result = response
			if (!response.success && !job.errorMessage) {
				job.errorMessage = redactSecrets(
					i18n.global.t(response.message_key, response.message_params),
					secrets,
				)
			}
			return response
		} catch (error) {
			job.status = 'error'
			job.errorMessage = redactSecrets(String(error), secrets)
			return null
		} finally {
			if (isActiveStatus(job.status)) {
				job.status = job.result?.success ? 'success' : 'error'
				job.finishedAt = Date.now()
			}
		}
	}

	function execute(input: RemoteCommandInput, meta: SshJobRunOptions = {}) {
		return run<RemoteCommandResult>('execute', 'ssh_execute_command', input, meta, roots => {
			let command = interpolator.interpolate(input.command, roots)
			let workingDir = input.working_dir

			if (workingDir) {
				workingDir = interpolator.interpolate(workingDir, roots)
			}

			return { ...input, command, working_dir: workingDir }
		})
	}

	function upload(input: RemoteUploadInput, meta: SshJobRunOptions = {}) {
		return run<RemoteTransferResult>('upload', 'ssh_upload_file', input, meta)
	}

	function download(input: RemoteDownloadInput, meta: SshJobRunOptions = {}) {
		return run<RemoteDownloadResult>('download', 'ssh_download_file', input, meta)
	}

	/**
	 * Lanza un lote del gestor de archivos: un único `invoke` alimenta varios
	 * jobs, correlacionados por la `key` de cada ítem. Conserva la forma de
	 * `SshJob`, así que la cancelación en cascada y la cola reutilizan el motor.
	 */
	async function runBatch(
		input: RemoteTransferBatchInput,
		metas: SshBatchJobMeta[] = [],
		onEvent?: (event: RemoteFileManagerEvent) => void,
	): Promise<CommandResponse<RemoteBatchResult> | null> {
		const metaByKey = new Map(metas.map(meta => [meta.key, meta]))
		const batchJobs: SshJob[] = []

		for (const item of input.items) {
			const meta = metaByKey.get(item.key)
			const job = reactive<SshJob<RemoteTransferItemResult>>({
				key: item.key,
				label: meta?.label,
				operation: item.direction === 'upload' ? 'upload' : 'download',
				dependsOn: [...(meta?.dependsOn ?? [])],
				status: 'pending',
				jobId: null,
				output: '',
				exitCode: null,
				errorMessage: '',
				result: null,
				finishStatus: null,
				createdAt: new Date().toISOString(),
				startedAt: null,
				finishedAt: null,
				bytesTransferred: null,
				bytesTotal: null,
				sourcePath: item.direction === 'upload' ? item.local_path : item.remote_path,
				targetPath: item.direction === 'upload' ? item.remote_path : item.local_path,
				files: [],
			})
			jobs.set(item.key, job as SshJob)
			batchJobs.push(job as SshJob)
		}

		if (batchJobs.length) activeKey.value = batchJobs[0]!.key

		const channel = new Channel<RemoteFileManagerEvent>()
		channel.onmessage = (event: RemoteFileManagerEvent) => {
			onEvent?.(event)
			switch (event.event) {
				case 'batch_started':
					// Todos los tokens existen desde el inicio: permite cancelar ítems pendientes.
					for (const [key, jobId] of Object.entries(event.job_ids)) {
						const job = jobs.get(key)
						if (job) job.jobId = jobId
					}
					break
				case 'item_started': {
					const job = jobs.get(event.key)
					if (!job) break
					job.jobId = event.job_id
					job.status = 'running'
					job.startedAt ??= Date.now()
					break
				}
				case 'file_list': {
					const job = jobs.get(event.key)
					if (!job) break
					job.files = event.files.map((file: RemoteTransferFileInfo): SshJobFile => ({
						id: file.id,
						path: file.path,
						relativePath: file.relative_path,
						size: file.size,
						bytes: 0,
						status: 'pending',
					}))
					break
				}
				case 'file_started': {
					const file = jobs.get(event.key)?.files?.find(f => f.id === event.file_id)
					if (!file) break
					// `event.bytes` es el tamaño declarado, ya reflejado en `file.size`:
					// los bytes transferidos siguen en 0 hasta el primer `file_progress`.
					file.status = 'running'
					break
				}
				case 'file_progress': {
					const file = jobs.get(event.key)?.files?.find(f => f.id === event.file_id)
					if (!file) break
					file.bytes = event.bytes
					break
				}
				case 'file_finished': {
					const file = jobs.get(event.key)?.files?.find(f => f.id === event.file_id)
					if (!file) break
					file.status = statusFromFinish(event.status)
					file.bytes = event.bytes
					file.messageKey = event.message_key
					break
				}
				case 'progress': {
					const job = jobs.get(event.key)
					if (!job) break
					job.bytesTransferred = event.bytes
					job.bytesTotal = event.total
					break
				}
				case 'item_finished': {
					const job = jobs.get(event.key)
					if (!job) break
					// Un dependiente cancelado antes de empezar ya está `skipped`.
					if (job.status !== 'skipped') job.status = statusFromFinish(event.status)
					job.finishStatus = event.status
					job.exitCode =
						event.status === 'success' ? 0 : event.status === 'cancelled' ? 130 : 1
					job.finishedAt = Date.now()
					job.errorMessage = event.result.message_key
						? i18n.global.t(event.result.message_key, event.result.message_params)
						: (event.result.message ?? '')
					job.output += event.result.output
					;(job as unknown as SshJob<RemoteTransferItemResult>).result = {
						success: event.status === 'success',
						data: event.result,
						message_key: '',
						message_params: {},
					}
					break
				}
				case 'batch_finished':
					// El recuento agregado viaja también en la respuesta del invoke.
					break
			}
		}

		try {
			const response = await invoke<CommandResponse<RemoteBatchResult>>(
				'ssh_file_manager_transfer',
				{ input, channel },
			)
			if (!response.success) {
				const message = i18n.global.t(response.message_key, response.message_params)
				for (const job of batchJobs) {
					if (!job.errorMessage) job.errorMessage = message
				}
			}
			return response
		} catch (error) {
			for (const job of batchJobs) {
				job.status = 'error'
				job.errorMessage = String(error)
			}
			return null
		} finally {
			for (const job of batchJobs) {
				if (isActiveStatus(job.status)) {
					job.status = job.result?.success ? 'success' : 'error'
					job.finishedAt = Date.now()
				}
			}
		}
	}

	/**
	 * Restaura los snapshots persistidos. Los estados no terminales se marcan
	 * como `interrupted`: el token de Rust ya no existe en esta sesión.
	 */
	function restoreJobs(snapshots: readonly FileManagerTransferSnapshot[]): void {
		for (const snapshot of snapshots) {
			if (jobs.has(snapshot.key)) continue

			const match = /^ssh-job-(\d+)$/.exec(snapshot.key)
			if (match) sequence = Math.max(sequence, Number(match[1]))

			const restored = reactive<SshJob>({
				key: snapshot.key,
				label: snapshot.label,
				operation: snapshot.operation,
				dependsOn: [],
				status:
					snapshot.status === 'running' || snapshot.status === 'pending'
						? 'interrupted'
						: snapshot.status,
				jobId: null,
				output: snapshot.output,
				exitCode: snapshot.exitCode,
				errorMessage: snapshot.errorMessage,
				result: snapshot.result,
				finishStatus: snapshot.finishStatus,
				createdAt: snapshot.createdAt,
				startedAt: snapshot.startedAt,
				finishedAt: snapshot.finishedAt,
				bytesTransferred: snapshot.bytesTransferred,
				bytesTotal: snapshot.bytesTotal,
				sourcePath: snapshot.sourcePath,
				targetPath: snapshot.targetPath,
				files: snapshot.files?.map(file => ({ ...file })),
			})
			jobs.set(snapshot.key, restored)
		}
	}

	return {
		jobs,
		activeKey,
		activeJob,
		orderedJobs,
		restoreJobs,
		output,
		isRunning,
		lastExitCode,
		errorMessage,
		currentJobId,
		lastFinishStatus,
		lastStatus,
		appendOutput,
		clear,
		cancel,
		cancelAll,
		execute,
		upload,
		download,
		runBatch,
	}
}
