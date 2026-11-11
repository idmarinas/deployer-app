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
