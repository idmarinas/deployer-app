import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import { useFileManagerPersistence } from '@/stores/fileManagerPersistence'
import { normalizeRemotePath } from '@/utils/paths'

export type FileManagerTab = 'files' | 'transfers'

export interface FileManagerTransferOptions {
	overwrite: boolean
	chmod: string
	recursive: boolean
}

/** Claves antiguas de `useStorage`, que solo se leen una vez para migrar. */
const LEGACY_KEYS = {
	tab: 'deployer-file-manager-tab',
	host: 'deployer-file-manager-host',
	localPath: 'deployer-file-manager-local-path',
	remotePath: 'deployer-file-manager-remote-path',
} as const

const MIGRATION_KEY = 'migration:localStorage:v1'

function clampConcurrency(value: unknown): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) return 2
	return Math.min(16, Math.max(1, Math.trunc(parsed)))
}

/**
 * Preferencias del gestor. Toda la escritura va a SQLite; `localStorage` solo
 * se consulta en la primera ejecución para migrar las claves históricas.
 */
export const useFileManagerPreferences = defineStore('fileManagerPreferences', () => {
	const persistence = useFileManagerPersistence()

	const tab = ref<FileManagerTab>('files')
	const hostId = ref<number | undefined>(undefined)
	const localPath = ref('')
	const remotePaths = reactive<Record<number, string>>({})
	const maxConcurrency = ref(2)
	const transferOptions = reactive<FileManagerTransferOptions>({
		overwrite: true,
		chmod: '',
		recursive: true,
	})
	const hydrated = ref(false)

	function save(key: string, value: unknown) {
		void persistence.setPreference(key, value)
	}

	async function migrateLegacyStorage(): Promise<void> {
		if (await persistence.getPreference<boolean>(MIGRATION_KEY)) {
			for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key)
			return
		}

		const legacyTab = localStorage.getItem(LEGACY_KEYS.tab)
		const legacyHost = localStorage.getItem(LEGACY_KEYS.host)
		const legacyLocalPath = localStorage.getItem(LEGACY_KEYS.localPath)
		const legacyRemotePath = localStorage.getItem(LEGACY_KEYS.remotePath)

		let migratedHost: number | undefined
		if (legacyHost) {
			const parsed = Number(legacyHost)
			if (Number.isFinite(parsed) && parsed > 0) migratedHost = parsed
		}

		if (legacyTab === 'transfers') tab.value = 'transfers'
		if (legacyLocalPath) localPath.value = legacyLocalPath
		if (migratedHost && legacyRemotePath) {
			remotePaths[migratedHost] = normalizeRemotePath(legacyRemotePath)
		}

		save('tab', tab.value)
		save('localPath', localPath.value)
		save('remotePaths', { ...remotePaths })
		await persistence.setPreference(MIGRATION_KEY, true)

		for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key)
	}

	async function hydrate(): Promise<void> {
		if (hydrated.value) return

		const all = await persistence.getAllPreferences()
		if (all.tab === 'files' || all.tab === 'transfers') tab.value = all.tab
		hostId.value = typeof all.hostId === 'number' ? all.hostId : undefined
		if (typeof all.localPath === 'string') localPath.value = all.localPath
		if (all.remotePaths && typeof all.remotePaths === 'object') {
			for (const [key, value] of Object.entries(all.remotePaths as Record<string, unknown>)) {
				const id = Number(key)
				if (Number.isFinite(id) && typeof value === 'string') remotePaths[id] = normalizeRemotePath(value)
			}
		}
		maxConcurrency.value = clampConcurrency(all.maxConcurrency)
		if (all.transferOptions && typeof all.transferOptions === 'object') {
			const options = all.transferOptions as Partial<FileManagerTransferOptions>
			transferOptions.overwrite = options.overwrite ?? true
			transferOptions.chmod = typeof options.chmod === 'string' ? options.chmod : ''
			transferOptions.recursive = options.recursive ?? true
		}

		await migrateLegacyStorage()
		hydrated.value = true
	}

	function setTab(value: FileManagerTab) {
		tab.value = value
		save('tab', value)
	}

	function setHostId(value: number | undefined) {
		hostId.value = value
		save('hostId', value ?? null)
	}

	function setLocalPath(path: string) {
		localPath.value = path
		save('localPath', path)
	}

	function getRemotePath(id: number | undefined): string {
		return id ? (remotePaths[id] ?? '/') : '/'
	}

	function setRemotePath(id: number | undefined, path: string) {
		if (!id) return
		remotePaths[id] = normalizeRemotePath(path)
		save('remotePaths', { ...remotePaths })
	}

	/** Borra la preferencia de ese host: vuelve a aplicar su directorio base. */
	function resetRemotePath(id: number | undefined) {
		if (!id) return
		delete remotePaths[id]
		save('remotePaths', { ...remotePaths })
	}

	async function getInitialRemotePath(id: number | undefined): Promise<string> {
		if (!id) return '/'
		const stored = getRemotePath(id)
		if (stored !== '/') return stored
		const base = await persistence.getHostDefaultRemotePath(id)
		return normalizeRemotePath(base)
	}

	function setMaxConcurrency(value: number) {
		maxConcurrency.value = clampConcurrency(value)
		save('maxConcurrency', maxConcurrency.value)
	}

	function setTransferOptions(options: Partial<FileManagerTransferOptions>) {
		Object.assign(transferOptions, options)
		save('transferOptions', { ...transferOptions })
	}

	return {
		tab,
		hostId,
		localPath,
		remotePaths,
		maxConcurrency,
		transferOptions,
		hydrated,
		hydrate,
		setTab,
		setHostId,
		setLocalPath,
		getRemotePath,
		setRemotePath,
		resetRemotePath,
		getInitialRemotePath,
		setMaxConcurrency,
		setTransferOptions,
	}
})
