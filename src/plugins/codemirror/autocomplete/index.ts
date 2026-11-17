import type { CompletionSource } from '@codemirror/autocomplete'
import type { Language } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'

/**
 * Añade una fuente de autocompletado **sin sustituir** las del lenguaje.
 *
 * Se registra como `languageData` (`EditorState.languageData`), que es el mismo
 * canal que usan los lenguajes para declarar las suyas. `autocompletion()` (en
 * `createBaseExtensions`) lee de ahí, así que la fuente propia se suma a las de
 * JavaScript, HTML, etc. en lugar de anularlas.
 *
 * Antes se usaba `autocompletion({ override: [source] })`, que reemplazaba
 * todas las fuentes del lenguaje.
 */
export function createAutocompleteExtension(source: CompletionSource | undefined): Extension {
	return source ? EditorState.languageData.of(() => [{ autocomplete: source }]) : []
}

/**
 * Registra una fuente de autocompletado en un lenguaje concreto.
 *
 * Útil para lenguajes que no traen ninguna (PHP, JSON, YAML, Bash):
 *
 * ```ts
 * const { php, phpLanguage } = await import('@codemirror/lang-php')
 * return [php(), withAutocomplete(phpLanguage, completeFromList([...]))]
 * ```
 */
export function withAutocomplete(language: Language, source: CompletionSource): Extension {
	return language.data.of({ autocomplete: source })
}
