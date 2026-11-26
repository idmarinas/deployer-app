import type { FileEntry } from '@/types/fileManager'

/**
 * Utilidades de rutas para el gestor de archivos. Las rutas remotas son POSIX
 * (`/`); las locales conservan el separador nativo y no se normalizan aquí.
 */

/** Normaliza una ruta remota a `/...`, colapsando barras y sin barra final. */
export function normalizeRemotePath(path: string | null | undefined): string {
	if (!path) return '/'

	const collapsed = path.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/')
	if (!collapsed) return '/'

	return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/'
}

/** Une una base remota con un nombre de entrada. */
export function joinRemotePath(base: string, name: string): string {
	return `${normalizeRemotePath(base).replace(/\/+$/, '')}/${name}`
}

/** Compara rutas locales y remotas con un único separador y sin barra final. */
function comparablePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/+$/, '') || '/'
}

/**
 * Reduce una selección del árbol a sus entradas de nivel superior.
 *
 * `UTree` con `propagate-select` marca también los descendientes de una
 * carpeta; transferirlos por separado duplicaría los archivos que ya copia la
 * carpeta. Este filtro también elimina claves repetidas.
 */
export function topLevelEntries(entries: readonly FileEntry[]): FileEntry[] {
	const unique = new Map<string, FileEntry>()
	for (const entry of entries) unique.set(entry.key, entry)

	const candidates = [...unique.values()]
	return candidates.filter(entry => {
		const path = comparablePath(entry.path)
		return !candidates.some(other => {
			if (other.key === entry.key || other.kind !== 'dir') return false
			const base = comparablePath(other.path)
			if (base === '/') return path !== '/' && path.startsWith('/')
			return path.startsWith(`${base}/`)
		})
	})
}

/**
 * Valida que una ruta base remota sea absoluta: POSIX (`/...`), unidad de
 * Windows (`C:\...`) o UNC (`\\servidor\...`). Se rechazan relativas, `..` y
 * saltos de línea. Vacío significa «usar `/`».
 */
export function isValidAbsoluteRemotePath(value: string | null | undefined): boolean {
	if (value === null || value === undefined || value.trim() === '') return true

	const path = value.trim()
	if (/[\r\n\0]/.test(path)) return false
	if (/(^|[/\\])\.\.([/\\]|$)/.test(path)) return false
	if (path.startsWith('/')) return true
	if (/^[A-Za-z]:[\\/]/.test(path)) return true
	if (/^\\\\/.test(path)) return true

	return false
}
