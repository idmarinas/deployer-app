import type { LocaleMessageValue } from 'vue-i18n'

export default {
	suggestion: {
		text: 'Texto',
		paragraph: 'Párrafo',
		heading1: 'Encabezado 1',
		heading2: 'Encabezado 2',
		heading3: 'Encabezado 3',
		heading4: 'Encabezado 4',
		lists: 'Listas',
		bulletList: 'Lista con viñetas',
		numberedList: 'Lista numerada',
		insert: 'Insertar',
		blockquote: 'Cita',
		codeBlock: 'Bloque de código',
		divider: 'Divisor',
	},
	toolbar: {
		headings: 'Encabezados',
		bold: 'Negrita',
		italic: 'Cursiva',
		underline: 'Subrayado',
		strikethrough: 'Tachado',
		code: 'Código',
	},
	dropdown: {
		turnInto: 'Convertir en',
		resetFormatting: 'Restablecer formato',
		duplicate: 'Duplicar',
		copyToClipboard: 'Copiar al portapapeles',
		moveUp: 'Mover arriba',
		moveDown: 'Mover abajo',
		delete: 'Eliminar',
	},
	counter: {
		chars: 'carácteres',
		words: 'palabras',
		json: 'json',
	},
} satisfies LocaleMessageValue
