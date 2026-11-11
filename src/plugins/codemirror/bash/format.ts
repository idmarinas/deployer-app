import type { EditorView } from '@codemirror/view'

import { locateFormat, unescapeBashC, wrapBashC, wrapHeredoc, type BashFormat } from './blocks'

export interface SetBashFormatOptions {
	view: EditorView | undefined
	doc: string
	target: BashFormat | null
	/** Se usa cuando el editor aún no está montado. */
	setDoc: (doc: string) => void
}

/**
 * Aplica el envoltorio indicado o lo quita (`null`). Cambiar de formato convierte
 * el cuerpo sin perderlo. Todo va en una única transacción para que el cursor se
 * mantenga y un solo `Ctrl+Z` revierta el cambio completo.
 */
export function setBashFormat({ view, doc, target, setDoc }: SetBashFormatOptions): void {
	const info = locateFormat(doc)
	if (info?.format === target || (target === null && !info)) return

	const { anchor, head } = view?.state.selection.main ?? { anchor: doc.length, head: doc.length }

	// Posición del cursor relativa al cuerpo lógico (descontando escapes de `bash -c`)
	const rawOffset = (pos: number) => {
		if (!info) return Math.min(pos, doc.length)
		const start = info.bodyStart
		const end = start + info.displayed.length
		const prefix = info.displayed.slice(0, Math.max(0, Math.min(pos, end) - start))
		return info.format === 'bash-c' ? unescapeBashC(prefix).length : prefix.length
	}

	const rawBody = info?.body ?? doc
	const wrapped =
		target === null
			? { doc: rawBody, bodyStart: 0, body: rawBody }
			: target === 'heredoc'
				? wrapHeredoc(rawBody)
				: wrapBashC(rawBody)

	const map = (pos: number) => wrapped.bodyStart + Math.min(rawOffset(pos), wrapped.body.length)

	if (!view) {
		setDoc(wrapped.doc)
		return
	}

	view.dispatch({
		changes: { from: 0, to: doc.length, insert: wrapped.doc },
		selection: { anchor: map(anchor), head: map(head) },
		scrollIntoView: true,
	})
}
