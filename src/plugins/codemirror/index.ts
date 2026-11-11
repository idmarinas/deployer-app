export { CODE_LANGUAGES } from './types'
export type { CodeHighlightRange, CodeHighlighter, CodeLanguage } from './types'

export { codeEditorTheme, codeHighlightStyle, SECRET_ICON_MASK } from './theme'
export { editableExtensions } from './editable'
export { highlightExtension } from './highlight'
export { createBaseExtensions, createDarkThemeExtension } from './setup'
export type { BaseExtensionsOptions } from './setup'
export { createAutocompleteExtension } from './autocomplete'
export { createInterpolationCompletion } from './autocomplete/variables'
export type { InterpolationCompletionConfig, InterpolationCompletionEntry } from './autocomplete/variables'
export { createLintExtensions } from './lint'
export { createLintLoader, LANGUAGE_NAMES, languageLoaders } from './languages'
export {
	escapeBashC,
	locateBashC,
	locateFormat,
	locateHeredoc,
	pickHeredocMarker,
	unescapeBashC,
	wrapBashC,
	wrapHeredoc,
} from './bash/blocks'
export type { BashFormat, FormatInfo, WrappedFormat } from './bash/blocks'
export { setBashFormat } from './bash/format'
export type { SetBashFormatOptions } from './bash/format'
