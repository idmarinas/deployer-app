import type { Diagnostic, LintSource } from '@codemirror/lint'
import { parseDocument } from 'yaml'

/** Linter de YAML basado en `parseDocument` (marca errores y warnings). */
export function createYamlLintSource(): LintSource {
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
}
