import { linter, lintGutter, type LintSource } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'

/**
 * Combina el linter propio del lenguaje con uno personalizado (si existe) y
 * devuelve las extensiones de lint. Sin fuentes, devuelve un array vacío.
 */
export function createLintExtensions(
	builtin: LintSource | null,
	custom: LintSource | undefined,
): Extension[] {
	const source: LintSource | null =
		custom && builtin ? async view => [...(await builtin(view)), ...(await custom(view))] : (custom ?? builtin)

	return source ? [linter(source), lintGutter()] : []
}
