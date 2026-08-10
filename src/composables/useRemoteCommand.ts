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

/**
 * Composable de consola remota.
 *
 * Encapsula la creación del `Channel` y la llamada a los comandos SSH sueltos
 * (`ssh_execute_command`, `ssh_upload_file`, `ssh_download_file`), acumulando el
 * output en streaming y exponiendo estado reactivo para la UI.
 *
 * El output se acumula línea a línea en `output.value` conforme llegan eventos
 * `output_chunk` del backend. `lastExitCode` recoge el código de salida del
 * evento `finished`, y `errorMessage` los errores de transporte (evento `error`
 * o rechazo del invoke).
 */
export default function useRemoteCommand() {
	const output = ref('')
	const isRunning = ref(false)
	const lastExitCode = ref<number | null>(null)
	const errorMessage = ref('')

	function clear() {
		output.value = ''
		lastExitCode.value = null
		errorMessage.value = ''
	}

	async function run<T>(commandName: string, input: unknown): Promise<CommandResponse<T> | null> {
		isRunning.value = true
		lastExitCode.value = null
		errorMessage.value = ''

		const channel = new Channel<RemoteConsoleEvent>()
		channel.onmessage = (event: RemoteConsoleEvent) => {
			switch (event.event) {
				case 'output_chunk':
					output.value += event.chunk
					break
				case 'finished':
					lastExitCode.value = event.exit_code
					break
				case 'error':
					errorMessage.value = event.message
					break
			}
		}

		try {
			return await invoke<CommandResponse<T>>(commandName, { input, channel })
		} catch (e) {
			errorMessage.value = String(e)
			return null
		} finally {
			isRunning.value = false
		}
	}

	function execute(input: RemoteCommandInput) {
		return run<RemoteCommandResult>('ssh_execute_command', input)
	}

	function upload(input: RemoteUploadInput) {
		return run<RemoteTransferResult>('ssh_upload_file', input)
	}

	function download(input: RemoteDownloadInput) {
		return run<RemoteDownloadResult>('ssh_download_file', input)
	}

	async function cancel() {
		try {
			await invoke('ssh_cancel_remote_job')
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
		clear,
		execute,
		upload,
		download,
		cancel,
	}
}
