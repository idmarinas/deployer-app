import type { FileEntry } from '@/types/fileManager'

/**
 * Caché de collators por idioma. Con `locale` vacío se usa el del entorno,
 * así que basta una única clave para todos los casos por defecto.
 */
const collators = new Map<string, Intl.Collator>()

function collatorFor(locale?: string): Intl.Collator {
	const key = locale ?? ''
	let collator = collators.get(key)
	if (!collator) {
		// `base` ignora tildes y mayúsculas; `numeric` ordena «archivo2» antes que
		// «archivo10». El desempate de abajo solo estabiliza resultados.
		collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
		collators.set(key, collator)
	}
	return collator
}

/** 0 = directorios, 1 = archivos, 2 = other / destinos no resolubles. */
function entryOrderRank(entry: FileEntry): 0 | 1 | 2 {
	if (entry.kind === 'dir' || (entry.kind === 'symlink' && entry.targetKind === 'dir')) return 0
	if (entry.kind === 'file' || (entry.kind === 'symlink' && entry.targetKind === 'file')) return 1
	return 2
}

/**
 * Devuelve una copia ordenada de las entradas: nunca muta props ni estado.
 * Los symlinks se colocan según el tipo de su destino, no según su `kind`.
 */
export function sortFileEntries(entries: readonly FileEntry[], locale?: string): FileEntry[] {
	const collator = collatorFor(locale)

	return [...entries].sort((a, b) => {
		const byRank = entryOrderRank(a) - entryOrderRank(b)
		if (byRank !== 0) return byRank

		const byName = collator.compare(a.name, b.name)
		if (byName !== 0) return byName

		// Solo para nombres que el collator considera equivalentes: mantiene un
		// orden estable entre sesiones sin introducir un criterio semántico.
		if (a.name !== b.name) return a.name < b.name ? -1 : 1
		if (a.key !== b.key) return a.key < b.key ? -1 : 1
		return 0
	})
}
