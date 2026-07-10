import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir variable global',
		edit: 'Editar variable global',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre visual para identificar la variable en la interfaz.',
	},
	slug: {
		label: 'Slug',
		help: () => 'Identificador único para usar en la interpolación, ej. {{slug}}.',
	},
	value: {
		label: 'Valor',
		help: 'Valor que tomará la variable durante el despliegue.',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito de la variable.',
	},
	is_secret: {
		label: 'Es secreta',
		help: 'Marca esta opción si la variable contiene información sensible (contraseñas, tokens, etc.).',
	},
} satisfies LocaleMessageValue
