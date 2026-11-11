import { type EditorState, type Extension, type Range } from '@codemirror/state'
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view'

import type { CodeHighlighter } from './types'

/**
 * Resalta los rangos que devuelve `source`.
 *
 * Se recalcula al cambiar el documento; una fuente nueva llega por el
 * compartimento y recrea el plugin. Los rangos son marcas (no bloques), así que
 * el texto sigue siendo editable con normalidad.
 */
export function highlightExtension(source: CodeHighlighter): Extension {
	function build(state: EditorState): DecorationSet {
		const ranges: Range<Decoration>[] = []

		for (const item of source(state.doc.toString())) {
			if (item.from >= item.to) continue

			const className = item.kind === 'secret' ? 'cm-interpolation-secret' : 'cm-interpolation'
			ranges.push(Decoration.mark({ class: className }).range(item.from, item.to))
		}

		return Decoration.set(ranges, true)
	}

	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet

			constructor(editorView: EditorView) {
				this.decorations = build(editorView.state)
			}

			update(update: ViewUpdate) {
				if (update.docChanged) this.decorations = build(update.state)
			}
		},
		{ decorations: plugin => plugin.decorations },
	)
}
