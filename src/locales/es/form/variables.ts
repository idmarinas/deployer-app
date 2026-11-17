import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir variable',
		edit: 'Editar variable',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre visual para identificar la variable en la interfaz.',
	},
	slug: {
		label: 'Slug',
		help: 'Identificador único usado para la interpolación. Solo minúsculas, números y guiones bajos; no se puede cambiar al editar.',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito de la variable.',
	},
	value: {
		label: 'Valor',
		help: 'Valor que se sustituirá al usar la variable.',
	},
	is_secret: {
		label: 'Es secreta',
		help: 'Marca esta opción si la variable contiene información sensible (contraseñas, tokens, etc.).',
	},
} satisfies LocaleMessageValue
