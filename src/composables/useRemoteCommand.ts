import type {
	RemoteCommandInput,
	RemoteDownloadInput,
	RemoteUploadInput,
} from '@/types/tauri-types'

import useSshJobs from '@/composables/useSshJobs'

/** Claves de trabajo opcionales para identificar cada operación de la consola. */
export interface RemoteCommandJobKeys {
	execute?: string
	upload?: string
	download?: string
}

/**
 * Fachada de la consola remota sobre el motor genérico `useSshJobs`.
 *
 * Conserva la API que ya consumen los componentes (`execute`/`upload`/
 * `download`/`cancel`/`clear`) y expone el estado de finalización y el registro
 * multi-job para cancelaciones selectivas.
 */
export default function useRemoteCommand(jobKeys: RemoteCommandJobKeys = {}) {
	const {
		jobs,
		activeKey,
		activeJob,
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
		execute: runExecute,
		upload: runUpload,
		download: runDownload,
	} = useSshJobs()

	const execute = (input: RemoteCommandInput) => runExecute(input, { key: jobKeys.execute })
	const upload = (input: RemoteUploadInput) => runUpload(input, { key: jobKeys.upload })
	const download = (input: RemoteDownloadInput) => runDownload(input, { key: jobKeys.download })

	return {
		jobs,
		activeKey,
		activeJob,
		output,
		isRunning,
		lastExitCode,
		errorMessage,
		currentJobId,
		lastFinishStatus,
		lastStatus,
		appendOutput,
		clear,
		execute,
		upload,
		download,
		cancel,
		cancelAll,
	}
}
