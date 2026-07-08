import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir variable global',
		edit: 'Editar variable global',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará a la variable. Se usará como clave en los entornos.',
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
