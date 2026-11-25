import type { SshJob } from '@/composables/useSshJobs'

/** Datos mínimos de una entrada remota necesarios para identificar una marca. */
export interface RemoteFileMarkSource {
	/** Ruta remota (con `/`). */
	path: string
	size: number
	/** Timestamp Unix en segundos; `null` si el servidor no lo informa. */
	modified: number | null
}

/** Entrada normalizada de un directorio, tanto local como remoto. */
export interface FileEntry {
	/** Clave estable (ruta completa con separadores nativos en local y `/` en remoto). */
	key: string
	/** Ruta usada por las transferencias. */
	path: string
	/** Nombre mostrado, sin la ruta padre. */
	name: string
	kind: 'dir' | 'file' | 'symlink' | 'other'
	size: number
	/** Timestamp Unix en segundos; `null` si el sistema no lo informa. */
	modified: number | null
	permissions: string | null
	/** Destino del enlace simbólico, si se pudo resolver. */
	target: string | null
	/**
	 * Tipo del destino del symlink (`dir` / `file`) cuando se pudo resolver.
	 * Opcional para no obligar a rellenarlo en entradas sintéticas de la cola;
	 * solo influye en el orden, nunca en el `kind` ni en la transferencia.
	 */
	targetKind?: 'dir' | 'file' | null
}

/** Marca «ya descargado» persistida por host, ruta, tamaño y fecha. */
export interface DownloadedMark extends RemoteFileMarkSource {
	markedAt: number
}

/** Estado persistido de un panel del gestor, identificado por `scope_key`. */
export interface FileManagerListingSnapshot {
	path: string
	entries: FileEntry[]
	childrenByKey: Record<string, FileEntry[]>
	loadedKeys: string[]
	expandedKeys: string[]
	selection: FileEntry[]
	/** El nivel mostrado se recortó por el límite de entradas del listado. */
	truncated: boolean
}

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

/** Job completo serializado en `deployer_file_manager_transfers`. */
export type FileManagerTransferSnapshot = Pick<
	SshJob,
	| 'key'
	| 'label'
	| 'operation'
	| 'status'
	| 'jobId'
	| 'output'
	| 'exitCode'
	| 'errorMessage'
	| 'result'
	| 'finishStatus'
	| 'startedAt'
	| 'finishedAt'
	| 'bytesTransferred'
	| 'bytesTotal'
	| 'sourcePath'
	| 'targetPath'
	| 'files'
> & {
	createdAt: string
	hostId: number
	retryOf: string | null
	request: FileManagerTransferRequest | null
}
