import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otro docker compose con el mismo nombre.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
	host_id: {
		required: 'Debes seleccionar un servidor.',
	},
	remote_path: {
		required: 'Debes introducir la ruta remota.',
	},
	compose_content: {
		required: 'Debes introducir el contenido del compose.',
	},
} satisfies LocaleMessageValue
