import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otra clave de acceso con el mismo nombre.',
	},
	key_type: {
		required: 'Debes seleccionar un tipo de clave de acceso.',
	},
	key_content: {
		required: 'Debes introducir el contenido de la clave privada.',
		not_empty: 'El contenido de la clave privada no puede estar vacío.',
	},
	passphrase: {
		required: 'Debes introducir la frase de contraseña de la clave de acceso.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
	passkey_id: {
		required: 'Debes seleccionar una clave de acceso.',
	},
	host: {
		required: 'Debes seleccionar un servidor.',
	},
	action: {
		required: 'Debes seleccionar una acción.',
	},
} satisfies LocaleMessageValue
