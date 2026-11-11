import { autocompletion, type CompletionSource } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

/** Envoltorio de autocompletado. Sin fuente, la extensión se desactiva. */
export function createAutocompleteExtension(source: CompletionSource | undefined): Extension[] {
	return source ? [autocompletion({ override: [source], activateOnTyping: true, closeOnBlur: true })] : []
}
