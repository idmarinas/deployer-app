import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Colores con tokens de Nuxt UI: se adaptan solos a tema claro/oscuro (sin hexadecimales)
export const codeHighlightStyle = HighlightStyle.define([
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
export const SECRET_ICON_MASK =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6'/%3E%3Cpath d='M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0'/%3E%3Cpath d='M8 11v-4a4 4 0 1 1 8 0v4'/%3E%3C/svg%3E\")"

export const codeEditorTheme = EditorView.theme({
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
