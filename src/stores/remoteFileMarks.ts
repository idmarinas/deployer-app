import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useFileManagerPersistence } from '@/stores/fileManagerPersistence'
import type { DownloadedMark, RemoteFileMarkSource } from '@/types/fileManager'

export type { RemoteFileMarkSource } from '@/types/fileManager'

export const MARK_KEY_PREFIX = 'deployer:file-manager:downloaded'
const LEGACY_KEY = 'deployer-remote-file-marks'

/** Clave compuesta: host + ruta + tamaño + fecha. */
export function markKey(hostId: number, source: RemoteFileMarkSource): string {
	return `${MARK_KEY_PREFIX}:${hostId}:${source.path}:${source.size}:${source.modified ?? 'unknown'}`
}

/**
 * Marcas «ya descargado» del gestor. SQLite es la única fuente de verdad; la
 * clave histórica de `localStorage` se lee una sola vez y se elimina.
 */
export const useRemoteFileMarks = defineStore('remoteFileMarks', () => {
	const persistence = useFileManagerPersistence()
	const marks = ref<Record<string, DownloadedMark>>({})
	let migrated = false

	/** Clave activa de una ruta, aunque el archivo haya cambiado de tamaño/fecha. */
	function activeKeyFor(hostId: number, path: string): string | undefined {
		const prefix = `${MARK_KEY_PREFIX}:${hostId}:`
		return Object.entries(marks.value).find(
			([key, mark]) => key.startsWith(prefix) && mark.path === path,
		)?.[0]
	}

	async function migrateLegacy(): Promise<void> {
		if (migrated) return
		migrated = true

		Object.assign(marks.value, await persistence.getMarks())

		const raw = localStorage.getItem(LEGACY_KEY)
		if (!raw) return

		try {
			const legacy = JSON.parse(raw) as Record<string, DownloadedMark>
			for (const [key, mark] of Object.entries(legacy)) {
				if (!mark || typeof mark.path !== 'string') continue
				const restored: DownloadedMark = {
					...mark,
					markedAt: typeof mark.markedAt === 'number' ? mark.markedAt : Date.now(),
				}
				marks.value[key] = restored
				await persistence.saveMark(key, restored)
			}
		} catch {
			// Una marca corrupta no debe impedir abrir el gestor.
		}

		localStorage.removeItem(LEGACY_KEY)
	}

	/** Carga las marcas de SQLite y completa la migración única. */
	async function hydrate(): Promise<void> {
		await migrateLegacy()
	}

	function markDownloaded(hostId: number, source: RemoteFileMarkSource) {
		const key = markKey(hostId, source)
		const previous = activeKeyFor(hostId, source.path)
		if (previous && previous !== key) {
			delete marks.value[previous]
			void persistence.deleteMark(previous)
		}

		const mark: DownloadedMark = { ...source, markedAt: Date.now() }
		marks.value[key] = mark
		void persistence.saveMark(key, mark)
	}

	function isDownloaded(hostId: number, source: RemoteFileMarkSource): boolean {
		return markKey(hostId, source) in marks.value
	}

	/**
	 * Descarta la marca de las entradas listadas cuyo tamaño o fecha ya no
	 * coinciden. No toca marcas de otras rutas (p. ej. directorios no visitados).
	 */
	function prune(hostId: number, entries: readonly RemoteFileMarkSource[]) {
		for (const entry of entries) {
			const active = activeKeyFor(hostId, entry.path)
			if (active && active !== markKey(hostId, entry)) {
				delete marks.value[active]
				void persistence.deleteMark(active)
			}
		}
	}

	function clear(hostId?: number) {
		if (hostId === undefined) {
			marks.value = {}
			void persistence.deleteAllMarks()
			return
		}

		const prefix = `${MARK_KEY_PREFIX}:${hostId}:`
		for (const key of Object.keys(marks.value)) {
			if (!key.startsWith(prefix)) continue
			delete marks.value[key]
			void persistence.deleteMark(key)
		}
	}

	return { marks, hydrate, markDownloaded, isDownloaded, prune, clear }
})
