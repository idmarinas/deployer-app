import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/** Bloquea o permite la edición del documento. */
export function editableExtensions(locked: boolean): Extension {
	return [EditorState.readOnly.of(locked), EditorView.editable.of(!locked)]
}
