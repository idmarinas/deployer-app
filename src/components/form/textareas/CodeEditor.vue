<script lang="ts">
import type { CodeHighlighter, CodeLanguage } from '@/plugins/codemirror/types'
import type { CompletionSource } from '@codemirror/autocomplete'
import type { LintSource } from '@codemirror/lint'

import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useColorMode } from '@vueuse/core'
import { basicSetup } from 'codemirror'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { createAutocompleteExtension } from '@/plugins/codemirror/autocomplete'
import { locateFormat, type BashFormat } from '@/plugins/codemirror/bash/blocks'
import { setBashFormat } from '@/plugins/codemirror/bash/format'
import { editableExtensions } from '@/plugins/codemirror/editable'
import { highlightExtension } from '@/plugins/codemirror/highlight'
import { createLintLoader, LANGUAGE_NAMES, languageLoaders } from '@/plugins/codemirror/languages'
import { createLintExtensions } from '@/plugins/codemirror/lint'
import { createBaseExtensions, createDarkThemeExtension } from '@/plugins/codemirror/setup'
import { CODE_LANGUAGES } from '@/plugins/codemirror/types'
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
		/**
		 * Extensiones CodeMirror adicionales (se combinan con las internas).
		 * Ejemplo: `:extensions="[myKeymap]"`.
		 */
		extensions?: Extension | readonly Extension[]
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
const customCompartment = new Compartment()

const isDark = computed(() => colorMode.value === 'dark')

const lintLoader = createLintLoader(key =>
	$t('form.shared.code_editor.lint.duplicate_key', { key }, { escapeParameter: false }),
)

const allowedLanguages = computed<readonly CodeLanguage[]>(() =>
	props.languages?.length ? props.languages : CODE_LANGUAGES,
)

const showBashTools = computed(() => language.value === 'bash')

const currentFormat = computed(() => {
	const info = locateFormat(model.value)
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

function setFormat(target: BashFormat | null) {
	setBashFormat({
		view: view.value,
		doc: model.value,
		target,
		setDoc: value => {
			model.value = value
		},
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
	const loader = lintLoader[lang]
	const builtin = loader ? await loader() : null

	// Si el lenguaje o el linter personalizado cambiaron mientras cargaba, se descarta
	if (language.value !== lang || props.lint !== custom) return

	view.value?.dispatch({
		effects: lintCompartment.reconfigure(createLintExtensions(builtin, custom)),
	})
}

/** (Re)configura la fuente de autocompletado. Sin fuente, la extensión se desactiva. */
function applyAutocomplete(source: CompletionSource | undefined) {
	view.value?.dispatch({
		effects: autocompleteCompartment.reconfigure(createAutocompleteExtension(source)),
	})
}

/** (Re)configura el resaltado de rangos. Sin fuente, la extensión se desactiva. */
function applyHighlight(source: CodeHighlighter | undefined) {
	view.value?.dispatch({
		effects: highlightCompartment.reconfigure(source ? highlightExtension(source) : []),
	})
}

/** (Re)configura las extensiones propias del consumidor. */
function applyCustomExtensions() {
	view.value?.dispatch({
		effects: customCompartment.reconfigure(props.extensions ?? []),
	})
}

onMounted(() => {
	view.value = new EditorView({
		parent: host.value!,
		state: EditorState.create({
			doc: model.value,
			extensions: [
				basicSetup,
				...createBaseExtensions({
					placeholder: props.placeholder,
					onDocChange: value => {
						model.value = value
					},
				}),
				darkCompartment.of(createDarkThemeExtension(isDark.value)),
				languageCompartment.of([]),
				lintCompartment.of([]),
				autocompleteCompartment.of([]),
				highlightCompartment.of([]),
				editableCompartment.of(editableExtensions(props.readonly || props.disabled)),
				customCompartment.of(props.extensions ?? []),
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

watch(
	() => props.extensions,
	() => applyCustomExtensions(),
)

// El facet `darkTheme` hace que los widgets propios de CodeMirror (tooltips, paneles,
// autocompletado…) usen sus variantes oscuras; los colores concretos vienen del tema.
watch(isDark, dark => {
	view.value?.dispatch({ effects: darkCompartment.reconfigure(createDarkThemeExtension(dark)) })
})

watch(
	() => [props.readonly, props.disabled],
	() =>
		view.value?.dispatch({
			effects: editableCompartment.reconfigure(editableExtensions(props.readonly || props.disabled)),
		}),
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
