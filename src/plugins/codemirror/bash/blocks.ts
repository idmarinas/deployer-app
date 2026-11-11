export type BashFormat = 'heredoc' | 'bash-c'

export interface FormatInfo {
	format: BashFormat
	/** Contenido lógico del bloque (sin los escapes de shell). */
	body: string
	/** Texto del cuerpo tal cual aparece en el documento. */
	displayed: string
	/** Índice donde empieza el cuerpo dentro del documento. */
	bodyStart: number
}

export interface WrappedFormat {
	doc: string
	bodyStart: number
	body: string
}

// Cabecera de heredoc: `bash <<'MARKER'` (o cualquier intérprete/`<<-` si se edita a mano)
const HEREDOC_HEADER = /^.*<<-?\s*'([A-Za-z0-9_]+)'\s*$/
// Cabecera de `bash -c '` (se admite `sh` u otra ruta al intérprete); el cierre se busca al final
const BASH_C_OPEN = /^(?:\S*\/)?(?:bash|sh)\s+-c\s+'/

export const escapeBashC = (text: string) => text.replaceAll(`'`, `'\\''`)
export const unescapeBashC = (text: string) => text.replaceAll(`'\\''`, `'`)

export function locateHeredoc(doc: string): FormatInfo | null {
	const lines = doc.split('\n')
	const match = HEREDOC_HEADER.exec(lines[0] ?? '')
	if (!match) return null

	const marker = match[1]!
	let markerIndex = lines.length - 1
	while (markerIndex > 0 && lines[markerIndex] === '') markerIndex--
	if (lines[markerIndex] !== marker) return null

	const body = lines.slice(1, markerIndex).join('\n')
	return {
		format: 'heredoc',
		body,
		displayed: body,
		bodyStart: (lines[0] ?? '').length + 1,
	}
}

export function locateBashC(doc: string): FormatInfo | null {
	const open = BASH_C_OPEN.exec(doc)
	if (!open) return null

	const trimmed = doc.replace(/\n+$/, '')
	// Debe existir una comilla de cierre después de la de apertura
	if (trimmed.length <= open[0].length || !trimmed.endsWith("'")) return null

	const prefixLength = open[0].length
	let displayed = trimmed.slice(prefixLength, -1)
	let bodyStart = prefixLength

	// Formato bloque (`bash -c '` + salto … salto + `'`): se descartan los saltos decorativos.
	// En una sola línea (`bash -c 'comando'`) el cuerpo empieza justo tras la comilla.
	if (displayed.startsWith('\n') && displayed.endsWith('\n')) {
		displayed = displayed.slice(1, -1)
		bodyStart += 1
	}

	return {
		format: 'bash-c',
		body: unescapeBashC(displayed),
		displayed,
		bodyStart,
	}
}

/** Detecta el formato del bloque bash (heredoc o `bash -c`), si lo hay. */
export function locateFormat(doc: string): FormatInfo | null {
	return locateHeredoc(doc) ?? locateBashC(doc)
}

/** Marcador que no aparezca ya en el cuerpo (`DEPLOYER_EOF`, `DEPLOYER_EOF_1`, ...). */
export function pickHeredocMarker(body: string): string {
	const base = 'DEPLOYER_EOF'
	let marker = base
	let suffix = 0
	while (body.includes(marker)) marker = `${base}_${++suffix}`
	return marker
}

export function wrapHeredoc(body: string): WrappedFormat {
	const trimmed = body.replace(/\n+$/, '')
	const marker = pickHeredocMarker(trimmed)
	const header = `bash <<'${marker}'\n`
	return {
		doc: `${header}${trimmed}${trimmed ? '\n' : ''}${marker}`,
		bodyStart: header.length,
		body: trimmed,
	}
}

export function wrapBashC(body: string): WrappedFormat {
	const trimmed = body.replace(/\n+$/, '')
	const displayed = escapeBashC(trimmed)
	const header = `bash -c '\n`
	return {
		doc: `${header}${displayed}${displayed ? '\n' : ''}'`,
		bodyStart: header.length,
		body: trimmed,
	}
}
