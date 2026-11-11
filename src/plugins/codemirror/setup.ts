import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { EditorState, type Extension } from '@codemirror/state'
import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers as lineNumbersExtension,
	placeholder as placeholderExtension,
} from '@codemirror/view'

import { codeEditorTheme, codeHighlightStyle } from './theme'

export interface BaseExtensionsOptions {
	lineNumbers?: boolean
	tabSize?: number
	placeholder?: string
	/** Se invoca cuando cambia el documento (sincroniza el `v-model`). */
	onDocChange?: (doc: string) => void
}

/** Extensiones base del editor: historial, keymaps, indentación, tema y placeholder. */
export function createBaseExtensions({
	lineNumbers = true,
	tabSize = 2,
	placeholder,
	onDocChange,
}: BaseExtensionsOptions = {}): Extension[] {
	const extensions: Extension[] = [
		lineNumbers ? [lineNumbersExtension(), highlightActiveLineGutter()] : [],
		history(),
		drawSelection(),
		indentOnInput(),
		bracketMatching(),
		highlightActiveLine(),
		EditorState.tabSize.of(tabSize),
		indentUnit.of(' '.repeat(tabSize)),
		keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap, indentWithTab]),
		syntaxHighlighting(codeHighlightStyle),
		codeEditorTheme,
		placeholder ? placeholderExtension(placeholder) : [],
	]

	if (onDocChange) {
		const notifyDocChange = onDocChange
		extensions.push(
			EditorView.updateListener.of(update => {
				if (update.docChanged) notifyDocChange(update.state.doc.toString())
			}),
		)
	}

	return extensions
}

/**
 * Facet de tema oscuro: hace que los widgets propios de CodeMirror (tooltips,
 * paneles, autocompletado…) usen sus variantes oscuras.
 */
export function createDarkThemeExtension(dark: boolean): Extension {
	return EditorView.darkTheme.of(dark)
}
