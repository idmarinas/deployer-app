import { Channel, invoke } from '@tauri-apps/api/core'
import type {
	CommandResponse,
	RemoteCommandInput,
	RemoteCommandResult,
	RemoteConsoleEvent,
	RemoteDownloadInput,
	RemoteDownloadResult,
	RemoteTransferResult,
	RemoteUploadInput,
} from '@/types/tauri-types'
import { ref } from 'vue'

import { loadGlobalScopeForExecution } from '@/drizzle/lib/variables'
import { i18n } from '@/i18n'
import { collectSecretValues, InterpolationError, interpolateString, redactSecrets } from '@/utils/interpolation'

/**
 * Composable de consola remota.
 *
 * Encapsula la creación del `Channel` y la llamada a los comandos SSH sueltos
 * (`ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`), acumulando el
 * output en streaming y exponiendo estado reactivo para la UI.
 *
 * El backend emite `started` con el id del job (en `currentJobId`, para poder
 * cancelarlo de forma selectiva), `output_chunk` con el output acumulado,
 * `finished` con el código de salida en `lastExitCode` y `error` con los
 * errores de transporte en `errorMessage` (o el rechazo del invoke).
 */
export default function useRemoteCommand() {
	const output = ref('')
	const isRunning = ref(false)
	const lastExitCode = ref<number | null>(null)
	const errorMessage = ref('')
	/** Id del job en curso, recibido en el evento `started` del backend. */
	const currentJobId = ref<number | null>(null)

	function clear() {
		output.value = ''
		lastExitCode.value = null
		errorMessage.value = ''
		currentJobId.value = null
	}

	async function run<T>(
		commandName: string,
		input: unknown,
		secrets: readonly string[] = [],
	): Promise<CommandResponse<T> | null> {
		isRunning.value = true
		lastExitCode.value = null
		errorMessage.value = ''
		currentJobId.value = null

		const channel = new Channel<RemoteConsoleEvent>()
		channel.onmessage = (event: RemoteConsoleEvent) => {
			switch (event.event) {
				case 'started':
					currentJobId.value = event.job_id
					break
				case 'output_chunk':
					output.value += event.chunk
					break
				case 'finished':
					lastExitCode.value = event.exit_code
					// Compatibilidad: el evento `error` ya aporta el mensaje; se evita
					// redundancia visible rellenando solo si aún no hay mensaje.
					if (event.status !== 'success' && event.message && !errorMessage.value) {
						errorMessage.value = redactSecrets(event.message, secrets)
					}
					break
				case 'error':
					if (!errorMessage.value) {
						errorMessage.value = redactSecrets(event.message, secrets)
					}
					break
			}
		}

		try {
			return await invoke<CommandResponse<T>>(commandName, { input, channel })
		} catch (e) {
			errorMessage.value = redactSecrets(String(e), secrets)
			return null
		} finally {
			isRunning.value = false
		}
	}

	async function execute(input: RemoteCommandInput) {
		const { t } = i18n.global

		let command: string
		let workingDir = input.working_dir
		let secrets: string[] = []

		try {
			const globalScope = await loadGlobalScopeForExecution()
			const roots = { global: globalScope }
			secrets = collectSecretValues(roots)

			command = interpolateString(input.command, roots, { maskSecrets: false })
			if (workingDir) {
				workingDir = interpolateString(workingDir, roots, { maskSecrets: false })
			}
		} catch (error) {
			errorMessage.value = redactSecrets(
				error instanceof InterpolationError ? t(error.messageKey, error.messageParams) : String(error),
				secrets,
			)

			return null
		}

		return run<RemoteCommandResult>('ssh_execute_command', { ...input, command, working_dir: workingDir }, secrets)
	}

	function upload(input: RemoteUploadInput) {
		return run<RemoteTransferResult>('ssh_upload_file', input)
	}

	function download(input: RemoteDownloadInput) {
		return run<RemoteDownloadResult>('ssh_download_file', input)
	}

	async function cancel(jobId?: number) {
		try {
			// Sin id, el backend cancela el último job registrado (best-effort).
			await invoke('ssh_cancel_remote_job', jobId === undefined ? {} : { jobId })
		} catch {
			// La cancelación es best-effort: el invoke de la operación remota
			// notificará el estado real a través del channel.
		}
	}

	return {
		output,
		isRunning,
		lastExitCode,
		errorMessage,
		currentJobId,
		clear,
		execute,
		upload,
		download,
		cancel,
	}
}
