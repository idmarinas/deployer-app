import {
	autocompletion,
	closeBrackets as closeBracketsExtension,
	closeBracketsKeymap,
	completionKeymap,
} from '@codemirror/autocomplete'
import {
	defaultKeymap,
	history as historyExtension,
	historyKeymap,
	indentWithTab,
} from '@codemirror/commands'
import {
	bracketMatching,
	foldGutter as foldGutterExtension,
	foldKeymap,
	indentOnInput,
	indentUnit,
	syntaxHighlighting,
} from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import {
	highlightSelectionMatches,
	search as searchExtension,
	searchKeymap,
} from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import {
	crosshairCursor,
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	type KeyBinding,
	lineNumbers as lineNumbersExtension,
	placeholder as placeholderExtension,
	rectangularSelection,
} from '@codemirror/view'

import { codeEditorTheme, codeHighlightStyle } from './theme'

export interface BaseExtensionsOptions {
	/** Muestra la columna de números de línea (y el resaltado de la línea activa en el gutter). */
	lineNumbers?: boolean
	/** Tamaño de tabulación y unidad de indentación, en espacios. */
	tabSize?: number
	placeholder?: string
	/** Se invoca cuando cambia el documento (sincroniza el `v-model`). */
	onDocChange?: (doc: string) => void
	/** Historial de deshacer/rehacer y sus atajos (`Ctrl+Z` / `Ctrl+Y`). */
	history?: boolean
	/** Gutter para plegar bloques y sus atajos. */
	foldGutter?: boolean
	/** Cierre automático de paréntesis, corchetes y comillas. */
	closeBrackets?: boolean
	/** Búsqueda (`Ctrl+F`) y resaltado de coincidencias de la selección. */
	search?: boolean
	/** Autocompletado de CodeMirror con las fuentes del lenguaje. */
	autocomplete?: boolean
	/** Selección múltiple y rectangular (`Alt+arrastrar`) y cursor de cruz. */
	multipleSelections?: boolean
}

/**
 * Extensiones base del editor. Compone lo mismo que `basicSetup` de
 * `codemirror`, pero con cada funcionalidad aislada para poder desactivarla
 * (incluidos sus keymaps) y con el tema y el resaltado propios.
 */
export function createBaseExtensions({
	lineNumbers = true,
	tabSize = 2,
	placeholder,
	onDocChange,
	history = true,
	foldGutter = true,
	closeBrackets = true,
	search = true,
	autocomplete = true,
	multipleSelections = true,
}: BaseExtensionsOptions = {}): Extension[] {
	// Los keymaps acompañan a su funcionalidad: si se desactiva, no se registran sus atajos.
	// El orden replica `basicSetup` (importa: `closeBracketsKeymap` debe ir antes que `defaultKeymap`
	// para que Backspace borre el par de comillas/paréntesis completo).
	const keyBindings: KeyBinding[] = []
	if (closeBrackets) keyBindings.push(...closeBracketsKeymap)
	keyBindings.push(...defaultKeymap)
	if (search) keyBindings.push(...searchKeymap)
	if (history) keyBindings.push(...historyKeymap)
	if (foldGutter) keyBindings.push(...foldKeymap)
	if (autocomplete) keyBindings.push(...completionKeymap)
	keyBindings.push(...lintKeymap, indentWithTab)

	const extensions: Extension[] = [
		lineNumbers ? [lineNumbersExtension(), highlightActiveLineGutter()] : [],
		highlightSpecialChars(),
		history ? historyExtension() : [],
		foldGutter ? foldGutterExtension() : [],
		drawSelection(),
		dropCursor(),
		multipleSelections
			? [EditorState.allowMultipleSelections.of(true), rectangularSelection(), crosshairCursor()]
			: [],
		indentOnInput(),
		bracketMatching(),
		closeBrackets ? closeBracketsExtension() : [],
		autocomplete ? autocompletion() : [],
		highlightActiveLine(),
		// `search()` aporta el `searchState` que necesita el panel de búsqueda (Ctrl+F);
		// `highlightSelectionMatches()` añade el resaltado de coincidencias de la selección.
		search ? [searchExtension(), highlightSelectionMatches()] : [],
		syntaxHighlighting(codeHighlightStyle),
		EditorState.tabSize.of(tabSize),
		indentUnit.of(' '.repeat(tabSize)),
		keymap.of(keyBindings),
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
