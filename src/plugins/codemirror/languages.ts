import { StreamLanguage } from '@codemirror/language'
import type { LintSource } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

import type { CodeLanguage } from './types'

// Cada lenguaje se importa bajo demanda (code splitting)
export const languageLoaders: Record<CodeLanguage, () => Promise<Extension>> = {
	bash: async () => StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell),
	yaml: async () => (await import('@codemirror/lang-yaml')).yaml(),
	json: async () => (await import('@codemirror/lang-json')).json(),
	php: async () => (await import('@codemirror/lang-php')).php(),
	plain: async () => [],
}

// Nombres propios: no se traducen. Solo "plain" tiene clave i18n.
export const LANGUAGE_NAMES: Record<Exclude<CodeLanguage, 'plain'>, string> = {
	bash: 'Bash',
	yaml: 'YAML',
	json: 'JSON',
	php: 'PHP',
}

type DuplicateKeyFormatter = (key: string) => string

// Linters por lenguaje (import bajo demanda). Bash y PHP no traen linter propio:
// para esos casos se puede pasar uno con la prop `lint`.
export function createLintLoader(
	formatDuplicateKey: DuplicateKeyFormatter,
): Partial<Record<CodeLanguage, () => Promise<LintSource>>> {
	return {
		json: async () => {
			const { createJsonLintSource } = await import('./lint/json')
			return createJsonLintSource(formatDuplicateKey)
		},
		yaml: async () => {
			const { createYamlLintSource } = await import('./lint/yaml')
			return createYamlLintSource()
		},
	}
}
