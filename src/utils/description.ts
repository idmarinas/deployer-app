import type { JSONContent } from '@tiptap/vue-3'

/**
 * Longitud máxima del JSON serializado en caracteres.
 * Equivale a ~50KB de texto, suficiente para descripciones ricas.
 */
export const DESCRIPTION_MAX_LENGTH = 50_000

/**
 * Serializa un JSONContent a string para almacenar en BD.
 * Devuelve null si el contenido está vacío o es undefined.
 */
export function serializeDescription(json: JSONContent | undefined | null): string | null {
	if (!json) return null

	const text = getTextContent(json)
	if (!text.trim()) return null

	const serialized = JSON.stringify(json)

	if (serialized.length > DESCRIPTION_MAX_LENGTH) {
		throw new Error(`description_too_long`)
	}

	return serialized
}

/**
 * Extrae texto plano de un JSONContent (para medir tamaño real).
 */
function getTextContent(node: JSONContent): string {
	if (!node.content) return ''

	let text = ''
	for (const child of node.content) {
		if (child.type === 'text' && child.text) {
			text += child.text
		}
		text += getTextContent(child)
	}
	return text
}

/**
 * Convierte un JSONContent o string serializado de BD a texto plano.
 * Útil para vistas truncadas donde el editor completo es demasiado pesado.
 */
export function descriptionToPlainText(raw: JSONContent | string | null | undefined): string {
	if (!raw) return ''

	if (typeof raw === 'object') {
		return getTextContent(raw)
	}

	let json: JSONContent | undefined
	try {
		json = JSON.parse(raw) as JSONContent
	} catch {
		return ''
	}

	if (!json) return ''
	return getTextContent(json)
}
