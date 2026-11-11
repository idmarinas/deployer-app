import { jsonLanguage, jsonParseLinter } from '@codemirror/lang-json'
import type { Diagnostic, LintSource } from '@codemirror/lint'

/**
 * Linter de JSON: errores de sintaxis + claves duplicadas.
 *
 * `JSON.parse` acepta claves repetidas (se queda con la última), así que se
 * detectan aparte recorriendo el árbol. El mensaje se delega a
 * `formatDuplicateKey` para no acoplar el linter a i18n.
 */
export function createJsonLintSource(formatDuplicateKey: (key: string) => string): LintSource {
	const parseLinter = jsonParseLinter()

	return view => {
		const doc = view.state.doc.toString()
		const diagnostics: Diagnostic[] = [...parseLinter(view)]
		const tree = jsonLanguage.parser.parse(doc)

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
							// El tooltip de lint es texto plano: el formateador evita escapar comillas.
							message: formatDuplicateKey(raw),
						})
					}
					seen.add(key)
				}
			},
		})

		return diagnostics
	}
}
