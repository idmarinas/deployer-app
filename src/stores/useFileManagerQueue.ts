import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useFileManagerPersistence } from '@/stores/fileManagerPersistence'
import type { FileManagerTransferSnapshot } from '@/types/fileManager'

/**
 * Cola persistida del gestor. Guarda un snapshot por job; el observable que
 * alimenta `save()` se conecta en la fachada `useRemoteFileManager`.
 */
/** Secuencia final de la clave (`ssh-job-N` / `file-transfer-<timestamp>-N`). */
function keySequence(key: string): number {
	const match = /(\d+)$/.exec(key)
	return match ? Number(match[1]) : 0
}

export const useFileManagerQueue = defineStore('fileManagerQueue', () => {
	const persistence = useFileManagerPersistence()
	const transfers = ref<FileManagerTransferSnapshot[]>([])
	const hydrated = ref(false)

	function sort() {
		transfers.value = [...transfers.value].sort((a, b) => {
			const byDate = b.createdAt.localeCompare(a.createdAt)
			return byDate || keySequence(b.key) - keySequence(a.key) || b.key.localeCompare(a.key)
		})
	}

	async function hydrate(): Promise<void> {
		if (hydrated.value) return
		transfers.value = await persistence.getTransfers()
		sort()
		hydrated.value = true
	}

	function save(snapshot: FileManagerTransferSnapshot) {
		const index = transfers.value.findIndex(item => item.key === snapshot.key)
		if (index >= 0) transfers.value[index] = snapshot
		else transfers.value.push(snapshot)
		sort()
		void persistence.saveTransfer(snapshot).catch((error: unknown) => {
			console.error(`[file-manager] No se pudo persistir ${snapshot.key}`, error)
		})
	}

	function remove(keys: string[]) {
		if (!keys.length) return
		transfers.value = transfers.value.filter(item => !keys.includes(item.key))
		void persistence.deleteTransfers(keys).catch((error: unknown) => {
			console.error('[file-manager] No se pudo borrar transferencias', keys, error)
		})
	}

	function clear() {
		transfers.value = []
		void persistence.deleteAllTransfers().catch((error: unknown) => {
			console.error('[file-manager] No se pudo limpiar transferencias', error)
		})
	}

	function get(key: string): FileManagerTransferSnapshot | undefined {
		return transfers.value.find(item => item.key === key)
	}

	return { transfers, hydrated, hydrate, save, remove, clear, get }
})
