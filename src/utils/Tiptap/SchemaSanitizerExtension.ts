import type { RawCommands } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import type { Schema } from '@tiptap/pm/model'

/**
 * Elimina recursivamente de un nodo JSON de ProseMirror los nodos y marks
 * que no existen en el schema actual del editor. Devuelve un nodo nuevo
 * (no muta el original) o null si el propio nodo debe eliminarse.
 */
function sanitizeNode(node: any, schema: Schema): any {
	if (!node || typeof node !== 'object') return null

	// Si el nodo no existe en el schema → eliminarlo
	if (!schema.nodes[node.type]) {
		return null
	}

	const cleaned: any = { ...node }

	// Sanitizar marks
	if (Array.isArray(cleaned.marks)) {
		cleaned.marks = cleaned.marks.filter((mark: any) => schema.marks[mark?.type])
		if (cleaned.marks.length === 0) delete cleaned.marks
	}

	// Sanitizar contenido recursivamente
	if (Array.isArray(cleaned.content)) {
		cleaned.content = cleaned.content.map((child: any) => sanitizeNode(child, schema)).filter(Boolean)
	}

	return cleaned
}

export const SchemaSanitizer = Extension.create({
	name: 'schemaSanitizer',

	// Sanea el contenido inicial: `new Editor({ content })` no pasa por
	// el comando setContent, así que hay que limpiarlo aquí también.
	onBeforeCreate() {
		const editor = this.editor
		const schema = editor.schema
		const initialContent = editor.options.content

		if (initialContent && typeof initialContent === 'object') {
			editor.options.content = sanitizeNode(initialContent, schema)
		}
	},

	// Se ejecuta justo después de crearse el editor.
	// Emitimos el evento `update` para que el v-model de Vue se entere de que
	// el contenido cambió (si es que fue sanitizado en onBeforeCreate).
	onCreate() {
		this.editor.emit('update', {
			editor: this.editor,
			transaction: this.editor.state.tr,
			appendedTransactions: [],
		})
	},

	// `editor.commands` se reconstruye en cada acceso (es un getter),
	// por lo que sobrescribir `editor.commands.setContent = ...`
	// directamente NO tiene efecto: el objeto se descarta al instante.
	// La forma correcta de interceptar el comando es via addCommands().
	addCommands() {
		return {
			setContent:
				(content, options) =>
				({ editor, commands }) => {
					const clean = content && typeof content === 'object' ? sanitizeNode(content, editor.schema) : content

					return commands.setContent(clean, options)
				},
		} as Partial<RawCommands>
	},
})
