import type { LocaleMessageValue } from 'vue-i18n'

export default {
	key: {
		required: 'Debes introducir una clave para el comando.',
		format: 'La clave solo puede contener minúsculas, números y guiones bajos.',
		min: 'La clave debe tener al menos 3 caracteres.',
		max: 'La clave debe tener menos de 64 caracteres.',
		not_unique: 'Ya existe otro comando con la misma clave.',
	},
	name: {
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otro comando con el mismo nombre.',
	},
	command: {
		required: 'Debes introducir el comando a ejecutar.',
	},
	timeout: {
		min: 'El timeout debe ser de al menos 1 segundo.',
		max: 'El timeout no puede superar los 3600 segundos.',
	},
} satisfies LocaleMessageValue