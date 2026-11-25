import { defineStore } from 'pinia'
import { reactive } from 'vue'

import { useFileManagerPersistence } from '@/stores/fileManagerPersistence'
import type { FileManagerListingSnapshot } from '@/types/fileManager'

/** Clave estable de una instantánea: `local:<ruta>` o `remote:<host_id>:<ruta>`. */
export function listingScope(
	origin: 'local' | 'remote',
	path: string,
	hostId?: number,
): string {
	return origin === 'local' ? `local:${path}` : `remote:${hostId ?? 0}:${path}`
}

/**
 * Listados persistentes. Mantiene las instantáneas en memoria para reutilizarlas
 * al volver a un host y delega el guardado en `fileManagerPersistence`.
 */
export const useFileManagerListings = defineStore('fileManagerListings', () => {
	const persistence = useFileManagerPersistence()
	const snapshots = reactive<Record<string, FileManagerListingSnapshot>>({})

	async function load(scopeKey: string): Promise<FileManagerListingSnapshot | null> {
		if (!snapshots[scopeKey]) {
			const stored = await persistence.getListing(scopeKey)
			if (stored) snapshots[scopeKey] = stored
		}
		return snapshots[scopeKey] ?? null
	}

	function save(
		scopeKey: string,
		origin: 'local' | 'remote',
		path: string,
		hostId: number | undefined,
		snapshot: FileManagerListingSnapshot,
	) {
		snapshots[scopeKey] = snapshot
		void persistence.saveListing(scopeKey, origin, hostId, path, snapshot)
	}

	function remove(scopeKey: string) {
		delete snapshots[scopeKey]
		void persistence.deleteListing(scopeKey)
	}

	function purgeForHost(hostId: number) {
		const prefix = `remote:${hostId}:`
		for (const key of Object.keys(snapshots)) {
			if (key.startsWith(prefix)) delete snapshots[key]
		}
		void persistence.deleteListingsForHost(hostId)
	}

	async function purgeOrphans() {
		const enabled = await persistence.getEnabledHostIds()
		await persistence.purgeListingsExceptHosts(enabled)
		const prefixes = enabled.map(id => `remote:${id}:`)
		for (const key of Object.keys(snapshots)) {
			if (key.startsWith('remote:') && !prefixes.some(prefix => key.startsWith(prefix))) {
				delete snapshots[key]
			}
		}
	}

	return { snapshots, load, save, remove, purgeForHost, purgeOrphans }
})
