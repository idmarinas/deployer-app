<script lang="ts">
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
	bracketMatching,
	HighlightStyle,
	indentOnInput,
	indentUnit,
	StreamLanguage,
	syntaxHighlighting,
} from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers as lineNumbersExtension,
	placeholder as placeholderExtension,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export const CODE_LANGUAGES = ['bash', 'yaml', 'json', 'php', 'plain'] as const
export type CodeLanguage = (typeof CODE_LANGUAGES)[number]
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
	}>(),
	{ lineNumbers: true, tabSize: 2, minRows: 6, maxRows: 24 },
)

const model = defineModel<string>({ default: '' })
const language = defineModel<CodeLanguage>('language', { default: 'plain' })

const { t: $t } = useI18n()

const host = useTemplateRef<HTMLDivElement>('host')
const view = shallowRef<EditorView>()

const languageCompartment = new Compartment()
const editableCompartment = new Compartment()

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
})

function editableExtensions(): Extension {
	const locked = props.readonly || props.disabled
	return [EditorState.readOnly.of(locked), EditorView.editable.of(!locked)]
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

async function applyLanguage(lang: CodeLanguage) {
	const extension = await languageLoaders[lang]()
	// Si el lenguaje cambió mientras cargaba, esta respuesta llega tarde: se descarta
	if (language.value !== lang) return
	view.value?.dispatch({ effects: languageCompartment.reconfigure(extension) })
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
				keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
				syntaxHighlighting(highlightStyle),
				theme,
				props.placeholder ? placeholderExtension(props.placeholder) : [],
				languageCompartment.of([]),
				editableCompartment.of(editableExtensions()),
				EditorView.updateListener.of(update => {
					if (update.docChanged) model.value = update.state.doc.toString()
				}),
			],
		}),
	})

	applyLanguage(language.value)
})

// Cambios externos del v-model → editor (si coinciden con el documento, no hace nada)
watch(model, value => {
	const current = view.value
	if (!current || value === current.state.doc.toString()) return
	current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: value } })
})

watch(language, applyLanguage)

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
