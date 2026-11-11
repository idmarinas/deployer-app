/**
 * Autocompletado de expresiones `{{raíz.ruta}}` para CodeMirror.
 *
 * La fuente no depende de la UI: recibe las entradas disponibles y los ámbitos
 * válidos para el documento. Se activa al escribir `{{`: primero lista los
 * ámbitos disponibles y, al escribir una letra, filtra las variables. Solo
 * reconoce las raíces indicadas, de modo que las plantillas ajenas
 * (Docker/Go, Helm, Jinja) no disparan sugerencias.
 */

import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import { startCompletion } from '@codemirror/autocomplete'

/** Entrada sugerida por el autocompletado. */
export interface InterpolationCompletionEntry {
	/** Ruta completa sin llaves: `global.deploy_path`. */
	path: string
	/** Título visible (nombre de la variable). También se usa para ordenar. */
	label: string
	/** Texto secundario que se muestra debajo (ruta y valor). */
	detail?: string
	/** La variable es secreta: se marca con su propio icono, nunca con el valor. */
	secret?: boolean
}

export interface InterpolationCompletionConfig {
	/** Entradas disponibles; se leen en cada pulsación para reflejar cambios. */
	getEntries: () => readonly InterpolationCompletionEntry[]
	/**
	 * Ámbitos disponibles en este contexto (los que tienen raíz), ordenados.
	 * Por defecto, solo `global`.
	 */
	getScopes?: () => readonly string[]
}

const PARTIAL_RE = /\{\{([A-Za-z0-9_.]*)$/
const MAX_LOOKBEHIND = 120

/** ¿Los backslashes inmediatamente anteriores a `index` son impares? */
function isEscaped(state: EditorState, index: number): boolean {
	let backslashes = 0
	for (let i = index - 1; i >= 0 && state.doc.sliceString(i, i + 1) === '\\'; i--) backslashes++

	return backslashes % 2 === 1
}

/**
 * Filtra una entrada contra lo escrito.
 *
 * Con punto se compara la ruta completa (`global.de`). Sin punto se compara
 * también el último segmento y el título visible, de forma que `{{g` lista las
 * globales, `{{de` filtra por slug y `{{rut` encuentra «Ruta de despliegue».
 */
function matchEntry(entry: InterpolationCompletionEntry, partial: string): boolean {
	const lower = partial.toLowerCase()
	if (partial.includes('.')) return entry.path.toLowerCase().startsWith(lower)

	const slug = entry.path.slice(entry.path.lastIndexOf('.') + 1)

	return (
		entry.path.toLowerCase().startsWith(lower) ||
		slug.toLowerCase().startsWith(lower) ||
		entry.label.toLowerCase().startsWith(lower)
	)
}

/** Ajusta el final del reemplazo para no dejar restos de una expresión ya escrita. */
function findRangeEnd(state: EditorState, pos: number): number {
	// Si el cursor está en medio de la ruta (`{{global.de|ploy}}`), se consume el
	// resto del identificador para que no quede duplicado tras aceptar.
	const trailing = /^[A-Za-z0-9_.]*/.exec(state.sliceDoc(pos, pos + MAX_LOOKBEHIND))?.[0] ?? ''
	const end = pos + trailing.length

	// Consume un cierre ya escrito para no duplicar llaves.
	const after = state.sliceDoc(end, end + 2)
	if (after.startsWith('}}')) return end + 2
	if (after.startsWith('}')) return end + 1

	return end
}

export function createInterpolationCompletion(config: InterpolationCompletionConfig): CompletionSource {
	return (context: CompletionContext): CompletionResult | null => {
		const { state, pos } = context
		const match = PARTIAL_RE.exec(state.sliceDoc(Math.max(0, pos - MAX_LOOKBEHIND), pos))
		if (!match) return null

		const from = pos - match[0].length
		if (isEscaped(state, from)) return null

		const partial = match[1] ?? ''
		const options: Completion[] = []

		// Recién escrito `{{` se listan los ámbitos; las variables aparecen en
		// cuanto se escribe una letra para no volcar la lista completa.
		if (partial) {
			options.push(
				...config
					.getEntries()
					.filter(entry => matchEntry(entry, partial))
					.sort((a, b) => a.label.localeCompare(b.label))
					.map(entry => ({
						label: entry.label,
						detail: entry.detail,
						// `variable` conserva el icono por defecto; `secret` lo sustituye.
						type: entry.secret ? 'variable secret' : 'variable',
						apply: `{{${entry.path}}}`,
					})),
			)
		}

		// Las variables van primero para que `{{g` + Enter inserte una variable y
		// no se detenga en el ámbito.
		if (!partial.includes('.')) {
			const lower = partial.toLowerCase()
			for (const scope of config.getScopes?.() ?? ['global']) {
				if (!scope.toLowerCase().startsWith(lower)) continue

				options.push({
					label: scope,
					type: 'namespace',
					// Al aceptar el ámbito se abre de nuevo la lista para elegir la variable.
					apply: (view: EditorView, _completion, applyFrom: number, applyTo: number) => {
						const insert = `{{${scope}.`
						view.dispatch({
							changes: { from: applyFrom, to: applyTo, insert },
							selection: { anchor: applyFrom + insert.length },
						})
						startCompletion(view)
					},
				})
			}
		}

		if (options.length === 0) return null

		return {
			from,
			to: findRangeEnd(state, pos),
			options,
			// El filtrado ya se hizo aquí; evita que el sistema descarte opciones
			// por comparar contra la etiqueta completa (`global.slug`).
			filter: false,
		}
	}
}
