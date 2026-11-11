<script lang="ts">
import { autocompletion, type CompletionSource } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
	bracketMatching,
	HighlightStyle,
	indentOnInput,
	indentUnit,
	StreamLanguage,
	syntaxHighlighting,
} from '@codemirror/language'
import { linter, lintGutter, lintKeymap, type Diagnostic, type LintSource } from '@codemirror/lint'
import { Compartment, EditorState, type Extension, type Range } from '@codemirror/state'
import {
	Decoration,
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers as lineNumbersExtension,
	placeholder as placeholderExtension,
	ViewPlugin,
	type DecorationSet,
	type ViewUpdate,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { useColorMode } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export const CODE_LANGUAGES = ['bash', 'yaml', 'json', 'php', 'plain'] as const
export type CodeLanguage = (typeof CODE_LANGUAGES)[number]

/** Rango resaltado dentro del editor. */
export interface CodeHighlightRange {
	from: number
	to: number
	/** `variable` usa el color primario; `secret`, el ámbar de aviso. */
	kind: 'variable' | 'secret'
}

/** Calcula los rangos a resaltar a partir del texto del documento. */
export type CodeHighlighter = (text: string) => readonly CodeHighlightRange[]
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		/** Muestra la barra superior con el selector de lenguaje (requiere `v-model:language` para persistir el cambio). */
		selectable?: boolean
		/** Lenguajes permitidos en el selector (en ese orden). Si se omite o está vacío, se permiten todos. */
		languages?: readonly CodeLanguage[]
		placeholder?: string
		readonly?: boolean
		disabled?: boolean
		lineNumbers?: boolean
		tabSize?: number
		minRows?: number
		maxRows?: number
		/** Linter adicional (CodeMirror `LintSource`). Se combina con el linter propio del lenguaje. */
		lint?: LintSource
		/** Fuente de autocompletado adicional (CodeMirror `CompletionSource`). */
		autocomplete?: CompletionSource
		/** Resalta rangos del documento (p. ej. variables interpoladas). */
		highlight?: CodeHighlighter
	}>(),
	{ lineNumbers: true, tabSize: 2, minRows: 6, maxRows: 24 },
)

const model = defineModel<string>({ default: '' })
const language = defineModel<CodeLanguage>('language', { default: 'plain' })

const { t: $t } = useI18n()
const colorMode = useColorMode()

const host = useTemplateRef<HTMLDivElement>('host')
const view = shallowRef<EditorView>()

const languageCompartment = new Compartment()
const editableCompartment = new Compartment()
const lintCompartment = new Compartment()
const autocompleteCompartment = new Compartment()
const highlightCompartment = new Compartment()
const darkCompartment = new Compartment()

const isDark = computed(() => colorMode.value === 'dark')

// Cada lenguaje se importa bajo demanda (code splitting)
const languageLoaders: Record<CodeLanguage, () => Promise<Extension>> = {
	bash: async () => StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell),
	yaml: async () => (await import('@codemirror/lang-yaml')).yaml(),
	json: async () => (await import('@codemirror/lang-json')).json(),
	php: async () => (await import('@codemirror/lang-php')).php(),
	plain: async () => [],
}

// Nombres propios: no se traducen. Solo "plain" tiene clave i18n.
const LANGUAGE_NAMES: Record<Exclude<CodeLanguage, 'plain'>, string> = {
	bash: 'Bash',
	yaml: 'YAML',
	json: 'JSON',
	php: 'PHP',
}

// Linters por lenguaje (import bajo demanda). Bash y PHP no traen linter propio:
// para esos casos se puede pasar uno con la prop `lint`.
const lintLoaders: Partial<Record<CodeLanguage, () => Promise<LintSource>>> = {
	json: async () => {
		const { jsonLanguage, jsonParseLinter } = await import('@codemirror/lang-json')
		const parseLinter = jsonParseLinter()

		return view => {
			const doc = view.state.doc.toString()
			const diagnostics: Diagnostic[] = [...parseLinter(view)]
			const tree = jsonLanguage.parser.parse(doc)

			// JSON.parse acepta claves repetidas (se queda con la última), así que se detectan aparte.
			// Se recorren solo los objetos: sus hijos directos `Property` contienen `PropertyName`.
			tree.iterate({
				enter(node) {
					if (node.name !== 'Object') return

					const seen = new Set<string>()
					for (let property = node.node.firstChild; property; property = property.nextSibling) {
						if (property.name !== 'Property') continue

						const name = property.firstChild
						if (name?.name !== 'PropertyName') continue

						const raw = doc.slice(name.from, name.to)
						let key = raw
						try {
							// Normaliza escapes: "\u0070epe" y "pepe" son la misma clave
							key = JSON.parse(raw) as string
						} catch {
							// Si no es un string válido, se compara el texto tal cual
						}

						if (seen.has(key)) {
							diagnostics.push({
								from: name.from,
								to: name.to,
								severity: 'warning',
								// `escapeParameter` global convierte `"` en `&quot;`; el tooltip de lint es texto plano
								message: $t('form.shared.code_editor.lint.duplicate_key', { key: raw }, { escapeParameter: false }),
							})
						}
						seen.add(key)
					}
				},
			})

			return diagnostics
		}
	},
	yaml: async () => {
		const { parseDocument } = await import('yaml')
		return view => {
			const doc = view.state.doc.toString()
			const clamp = (pos: number) => Math.max(0, Math.min(pos, doc.length))
			const toDiagnostic = (
				item: { pos: [number, number]; message: string },
				severity: 'error' | 'warning',
			): Diagnostic => ({
				from: clamp(item.pos[0]),
				to: clamp(item.pos[1]),
				severity,
				message: item.message,
			})

			try {
				const parsed = parseDocument(doc, { prettyErrors: false })
				return [
					...parsed.errors.map(error => toDiagnostic(error, 'error')),
					...parsed.warnings.map(warning => toDiagnostic(warning, 'warning')),
				]
			} catch (error) {
				return [{ from: 0, to: 0, severity: 'error', message: (error as Error).message }]
			}
		}
	},
}

const allowedLanguages = computed<readonly CodeLanguage[]>(() =>
	props.languages?.length ? props.languages : CODE_LANGUAGES,
)

const showBashTools = computed(() => language.value === 'bash')

type BashFormat = 'heredoc' | 'bash-c'

interface FormatInfo {
	format: BashFormat
	/** Contenido lógico del bloque (sin los escapes de shell). */
	body: string
	/** Texto del cuerpo tal cual aparece en el documento. */
	displayed: string
	/** Índice donde empieza el cuerpo dentro del documento. */
	bodyStart: number
}

// Cabecera de heredoc: `bash <<'MARKER'` (o cualquier intérprete/`<<-` si se edita a mano)
const HEREDOC_HEADER = /^.*<<-?\s*'([A-Za-z0-9_]+)'\s*$/
// Cabecera de `bash -c '` (se admite `sh` u otra ruta al intérprete); el cierre se busca al final
const BASH_C_OPEN = /^(?:\S*\/)?(?:bash|sh)\s+-c\s+'/

const escapeBashC = (text: string) => text.replaceAll(`'`, `'\\''`)
const unescapeBashC = (text: string) => text.replaceAll(`'\\''`, `'`)

function locateHeredoc(doc: string): FormatInfo | null {
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

function locateBashC(doc: string): FormatInfo | null {
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

const currentFormat = computed(() => {
	const info = locateHeredoc(model.value) ?? locateBashC(model.value)
	return info ? { format: info.format, info } : null
})

// Los switches se derivan del texto: si se edita/borra el bloque a mano, se reflejan solos
const isHeredoc = computed({
	get: () => currentFormat.value?.format === 'heredoc',
	set: enabled => setFormat(enabled ? 'heredoc' : null),
})

const isBashC = computed({
	get: () => currentFormat.value?.format === 'bash-c',
	set: enabled => setFormat(enabled ? 'bash-c' : null),
})

const languageItems = computed(() =>
	allowedLanguages.value.map(value => ({
		value,
		label: value === 'plain' ? $t('form.shared.code_editor.plain') : LANGUAGE_NAMES[value],
	})),
)

// Si el lenguaje actual queda fuera de la lista permitida, se pasa al primero permitido
watch(
	allowedLanguages,
	allowed => {
		if (!allowed.includes(language.value)) language.value = allowed[0]!
	},
	{ immediate: true },
)

// Colores con tokens de Nuxt UI: se adaptan solos a tema claro/oscuro (sin hexadecimales)
const highlightStyle = HighlightStyle.define([
	{ tag: [t.keyword, t.controlKeyword, t.operatorKeyword], color: 'var(--ui-secondary)' },
	{ tag: [t.string, t.special(t.string)], color: 'var(--ui-success)' },
	{ tag: [t.number, t.bool, t.null], color: 'var(--ui-warning)' },
	{ tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--ui-text-dimmed)', fontStyle: 'italic' },
	{ tag: [t.variableName, t.propertyName, t.definition(t.variableName)], color: 'var(--ui-info)' },
	{ tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: 'var(--ui-primary)' },
	{ tag: [t.typeName, t.className, t.atom], color: 'var(--ui-primary)' },
	{ tag: [t.operator, t.punctuation, t.bracket], color: 'var(--ui-text-muted)' },
	{ tag: t.invalid, color: 'var(--ui-error)' },
])

// Icono de candado (Tabler) para las variables secretas del autocompletado.
// Se usa como máscara para heredar el color del tema.
const SECRET_ICON_MASK =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6'/%3E%3Cpath d='M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0'/%3E%3Cpath d='M8 11v-4a4 4 0 1 1 8 0v4'/%3E%3C/svg%3E\")"

const theme = EditorView.theme({
	'&': {
		color: 'var(--ui-text-highlighted)',
		backgroundColor: 'transparent',
		fontSize: '0.875rem',
		maxHeight: 'var(--code-editor-max-height)',
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.5', overflow: 'auto' },
	'.cm-content, .cm-gutter': { minHeight: 'var(--code-editor-min-height)' },
	'.cm-content': { caretColor: 'var(--ui-primary)', padding: '0.5rem 0' },
	'.cm-cursor': { borderLeftColor: 'var(--ui-primary)' },
	'.cm-gutters': {
		backgroundColor: 'var(--ui-bg-elevated)',
		color: 'var(--ui-text-dimmed)',
		border: 'none',
		borderRight: '1px solid var(--ui-border)',
	},
	'.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--ui-primary) 8%, transparent)' },
	'.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ui-text-highlighted)' },
	'.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
		backgroundColor: 'color-mix(in oklab, var(--ui-primary) 25%, transparent)',
	},
	'.cm-placeholder': { color: 'var(--ui-text-dimmed)' },
	// Lint: tooltip, subrayados y panel de diagnósticos con los tokens del tema (sin colores fijos)
	'.cm-tooltip': {
		backgroundColor: 'var(--ui-bg-elevated)',
		color: 'var(--ui-text-highlighted)',
		border: '1px solid var(--ui-border)',
		borderRadius: '0.375rem',
	},
	'.cm-tooltip .cm-tooltip-arrow:before': {
		borderTopColor: 'var(--ui-border)',
		borderBottomColor: 'var(--ui-border)',
	},
	'.cm-tooltip .cm-tooltip-arrow:after': {
		borderTopColor: 'var(--ui-bg-elevated)',
		borderBottomColor: 'var(--ui-bg-elevated)',
	},
	'.cm-tooltip-lint': { padding: '0', margin: '0' },
	'.cm-diagnostic': { padding: '0.375rem 0.5rem 0.375rem 0.625rem' },
	'.cm-diagnostic-error': { borderLeft: '5px solid var(--ui-error)' },
	'.cm-diagnostic-warning': { borderLeft: '5px solid var(--ui-warning)' },
	'.cm-diagnostic-info': { borderLeft: '5px solid var(--ui-info)' },
	'.cm-diagnostic-hint': { borderLeft: '5px solid var(--ui-primary)' },
	'.cm-diagnosticSource': { color: 'var(--ui-text-dimmed)', opacity: '1' },
	'.cm-diagnosticAction': {
		backgroundColor: 'var(--ui-bg-accented)',
		color: 'var(--ui-text-highlighted)',
		borderRadius: '0.25rem',
	},
	'.cm-lintRange-error': {
		backgroundImage: 'none',
		textDecoration: 'underline wavy var(--ui-error)',
		textUnderlineOffset: '2px',
	},
	'.cm-lintRange-warning': {
		backgroundImage: 'none',
		textDecoration: 'underline wavy var(--ui-warning)',
		textUnderlineOffset: '2px',
	},
	'.cm-lintRange-info': {
		backgroundImage: 'none',
		textDecoration: 'underline wavy var(--ui-info)',
		textUnderlineOffset: '2px',
	},
	'.cm-lintRange-hint': {
		backgroundImage: 'none',
		textDecoration: 'underline wavy var(--ui-primary)',
		textUnderlineOffset: '2px',
	},
	'.cm-lintRange-active': {
		backgroundColor: 'color-mix(in oklab, var(--ui-warning) 20%, transparent)',
	},
	// Autocompletado: misma paleta que el resto de tooltips
	'.cm-tooltip-autocomplete': {
		backgroundColor: 'var(--ui-bg-elevated)',
		border: '1px solid var(--ui-border)',
		borderRadius: '0.375rem',
		boxShadow: '0 8px 24px -12px color-mix(in oklab, var(--ui-text-highlighted) 30%, transparent)',
		overflow: 'hidden',
	},
	'.cm-tooltip-autocomplete > ul': {
		fontFamily: 'inherit',
		fontSize: '0.8125rem',
		maxHeight: '14rem',
	},
	'.cm-tooltip-autocomplete > ul > li': {
		// Dos líneas: título junto al icono y detalle a ancho completo debajo.
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		columnGap: '0.375rem',
		padding: '0.25rem 0.5rem',
		lineHeight: '1.4',
	},
	'.cm-tooltip-autocomplete > ul > li[aria-selected]': {
		backgroundColor: 'var(--ui-bg-accented)',
		color: 'var(--ui-text-highlighted)',
	},
	'.cm-completionIcon': {
		color: 'var(--ui-text-muted)',
		// El espaciado lo aporta el `column-gap` del `li`.
		width: '1em',
		paddingRight: '0',
		textAlign: 'center',
	},
	'.cm-completionIcon-secret': {
		color: 'var(--ui-warning)',
		opacity: '1',
		'&::after': {
			content: '""',
			display: 'inline-block',
			verticalAlign: '-0.1em',
			width: '0.85em',
			height: '0.85em',
			backgroundColor: 'currentColor',
			maskImage: SECRET_ICON_MASK,
			WebkitMaskImage: SECRET_ICON_MASK,
			maskSize: 'contain',
			WebkitMaskSize: 'contain',
			maskRepeat: 'no-repeat',
			WebkitMaskRepeat: 'no-repeat',
			maskPosition: 'center',
			WebkitMaskPosition: 'center',
		},
	},
	'.cm-completionLabel': {
		fontFamily: 'inherit',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
	'.cm-completionMatchedText': {
		color: 'var(--ui-primary)',
		fontWeight: '600',
		textDecoration: 'none',
	},
	'.cm-completionDetail': {
		// Ruta y valor en una segunda línea, alineados bajo el título.
		flex: '0 0 100%',
		boxSizing: 'border-box',
		paddingLeft: '1.25rem',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		color: 'var(--ui-text-dimmed)',
		fontSize: '0.75rem',
		fontStyle: 'normal',
	},
	// Variables interpoladas: mismo código de color que la vista previa
	'.cm-interpolation': {
		borderRadius: '0.125rem',
		backgroundColor: 'color-mix(in oklab, var(--ui-primary) 12%, transparent)',
		color: 'var(--ui-primary)',
	},
	'.cm-interpolation-secret': {
		borderRadius: '0.125rem',
		backgroundColor: 'color-mix(in oklab, var(--ui-warning) 14%, transparent)',
		color: 'var(--ui-warning)',
	},
	'.cm-panels': {
		backgroundColor: 'var(--ui-bg-elevated)',
		color: 'var(--ui-text-highlighted)',
	},
	'.cm-panel.cm-panel-lint': { borderTop: '1px solid var(--ui-border)' },
	'.cm-panel.cm-panel-lint ul [aria-selected]': { backgroundColor: 'var(--ui-bg-accented)' },
})

function editableExtensions(): Extension {
	const locked = props.readonly || props.disabled
	return [EditorState.readOnly.of(locked), EditorView.editable.of(!locked)]
}

/**
 * Resalta los rangos que devuelve `source`.
 *
 * Se recalcula al cambiar el documento; una fuente nueva llega por el
 * compartimento y recrea el plugin. Los rangos son marcas (no bloques), así que
 * el texto sigue siendo editable con normalidad.
 */
function highlightExtension(source: CodeHighlighter): Extension {
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

/** Marcador que no aparezca ya en el cuerpo (`DEPLOYER_EOF`, `DEPLOYER_EOF_1`, ...). */
function pickHeredocMarker(body: string): string {
	const base = 'DEPLOYER_EOF'
	let marker = base
	let suffix = 0
	while (body.includes(marker)) marker = `${base}_${++suffix}`
	return marker
}

function wrapHeredoc(body: string) {
	const trimmed = body.replace(/\n+$/, '')
	const marker = pickHeredocMarker(trimmed)
	const header = `bash <<'${marker}'\n`
	return {
		doc: `${header}${trimmed}${trimmed ? '\n' : ''}${marker}`,
		bodyStart: header.length,
		body: trimmed,
	}
}

function wrapBashC(body: string) {
	const trimmed = body.replace(/\n+$/, '')
	const displayed = escapeBashC(trimmed)
	const header = `bash -c '\n`
	return {
		doc: `${header}${displayed}${displayed ? '\n' : ''}'`,
		bodyStart: header.length,
		body: trimmed,
	}
}

/**
 * Aplica el envoltorio indicado o lo quita (`null`). Cambiar de formato convierte
 * el cuerpo sin perderlo. Todo va en una única transacción para que el cursor se
 * mantenga y un solo `Ctrl+Z` revierta el cambio completo.
 */
function setFormat(target: BashFormat | null) {
	const info = currentFormat.value?.info ?? null
	if (info?.format === target || (target === null && !info)) return

	const doc = model.value
	const { anchor, head } = view.value?.state.selection.main ?? { anchor: doc.length, head: doc.length }

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
	const current = view.value

	if (!current) {
		model.value = wrapped.doc
		return
	}

	current.dispatch({
		changes: { from: 0, to: doc.length, insert: wrapped.doc },
		selection: { anchor: map(anchor), head: map(head) },
		scrollIntoView: true,
	})
}

/**
 * Inserta texto en la posición del cursor (o sustituye la selección) y deja el
 * cursor justo después. Si el editor aún no está montado, lo añade al final.
 */
function insertAtCursor(text: string) {
	if (!text || props.readonly || props.disabled) return

	const current = view.value
	if (!current) {
		model.value += text
		return
	}

	const { from, to } = current.state.selection.main
	current.dispatch({
		changes: { from, to, insert: text },
		selection: { anchor: from + text.length },
		scrollIntoView: true,
	})
	current.focus()
}

defineExpose({ insertAtCursor })

async function applyLanguage(lang: CodeLanguage) {
	const extension = await languageLoaders[lang]()
	// Si el lenguaje cambió mientras cargaba, esta respuesta llega tarde: se descarta
	if (language.value !== lang) return
	view.value?.dispatch({ effects: languageCompartment.reconfigure(extension) })
}

async function applyLint(lang: CodeLanguage) {
	const custom = props.lint
	const loader = lintLoaders[lang]
	const builtin = loader ? await loader() : null

	// Si el lenguaje o el linter personalizado cambiaron mientras cargaba, se descarta
	if (language.value !== lang || props.lint !== custom) return

	const source: LintSource | null =
		custom && builtin ? async view => [...(await builtin(view)), ...(await custom(view))] : (custom ?? builtin)

	view.value?.dispatch({
		effects: lintCompartment.reconfigure(source ? [linter(source), lintGutter()] : []),
	})
}

/** (Re)configura la fuente de autocompletado. Sin fuente, la extensión se desactiva. */
function applyAutocomplete(source: CompletionSource | undefined) {
	view.value?.dispatch({
		effects: autocompleteCompartment.reconfigure(
			source ? autocompletion({ override: [source], activateOnTyping: true, closeOnBlur: true }) : [],
		),
	})
}

/** (Re)configura el resaltado de rangos. Sin fuente, la extensión se desactiva. */
function applyHighlight(source: CodeHighlighter | undefined) {
	view.value?.dispatch({
		effects: highlightCompartment.reconfigure(source ? highlightExtension(source) : []),
	})
}

onMounted(() => {
	view.value = new EditorView({
		parent: host.value!,
		state: EditorState.create({
			doc: model.value,
			extensions: [
				props.lineNumbers ? [lineNumbersExtension(), highlightActiveLineGutter()] : [],
				history(),
				drawSelection(),
				indentOnInput(),
				bracketMatching(),
				highlightActiveLine(),
				EditorState.tabSize.of(props.tabSize),
				indentUnit.of(' '.repeat(props.tabSize)),
				keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap, indentWithTab]),
				syntaxHighlighting(highlightStyle),
				theme,
				darkCompartment.of(EditorView.darkTheme.of(isDark.value)),
				props.placeholder ? placeholderExtension(props.placeholder) : [],
				languageCompartment.of([]),
				lintCompartment.of([]),
				autocompleteCompartment.of([]),
				highlightCompartment.of([]),
				editableCompartment.of(editableExtensions()),
				EditorView.updateListener.of(update => {
					if (update.docChanged) model.value = update.state.doc.toString()
				}),
			],
		}),
	})

	applyLanguage(language.value)
	applyLint(language.value)
	applyAutocomplete(props.autocomplete)
	applyHighlight(props.highlight)
})

// Cambios externos del v-model → editor (si coinciden con el documento, no hace nada)
watch(model, value => {
	const current = view.value
	if (!current || value === current.state.doc.toString()) return
	current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: value } })
})

watch(language, lang => {
	applyLanguage(lang)
	applyLint(lang)
})

watch(
	() => props.lint,
	() => applyLint(language.value),
)

watch(
	() => props.autocomplete,
	source => applyAutocomplete(source),
)

watch(
	() => props.highlight,
	source => applyHighlight(source),
)

// El facet `darkTheme` hace que los widgets propios de CodeMirror (tooltips, paneles,
// autocompletado…) usen sus variantes oscuras; los colores concretos vienen del tema.
watch(isDark, dark => {
	view.value?.dispatch({ effects: darkCompartment.reconfigure(EditorView.darkTheme.of(dark)) })
})

watch(
	() => [props.readonly, props.disabled],
	() => view.value?.dispatch({ effects: editableCompartment.reconfigure(editableExtensions()) }),
)

onBeforeUnmount(() => {
	view.value?.destroy()
	view.value = undefined
})
</script>

<template>
	<div
		class="font-pcb overflow-hidden rounded-md border border-default bg-default transition-colors focus-within:border-primary"
		:class="{ 'pointer-events-none cursor-not-allowed opacity-40': disabled }"
		:style="{
			'--code-editor-min-height': `calc(${minRows * 1.5}em + 1rem)`,
			'--code-editor-max-height': `calc(${maxRows * 1.5}em + 1rem)`,
		}"
	>
		<div
			v-if="selectable || showBashTools"
			class="flex items-center justify-between gap-2 border-b border-default bg-elevated px-2 py-1"
		>
			<div v-if="selectable" class="flex items-center gap-2">
				<span class="text-xs text-muted">{{ $t('form.shared.code_editor.language') }}</span>
				<USelect
					v-model="language"
					:items="languageItems"
					:disabled="disabled || readonly"
					:aria-label="$t('form.shared.code_editor.language')"
					size="xs"
					class="w-36"
				/>
			</div>
			<div v-if="showBashTools" class="ms-auto flex items-center gap-4">
				<UTooltip :text="$t('form.shared.code_editor.heredoc.help')">
					<USwitch
						v-model="isHeredoc"
						:label="$t('form.shared.code_editor.heredoc.label')"
						:disabled="disabled || readonly"
						size="xs"
					/>
				</UTooltip>
				<UTooltip :text="$t('form.shared.code_editor.bash_c.help')">
					<USwitch
						v-model="isBashC"
						:label="$t('form.shared.code_editor.bash_c.label')"
						:disabled="disabled || readonly"
						size="xs"
					/>
				</UTooltip>
			</div>
		</div>
		<div ref="host" />
	</div>
</template>
