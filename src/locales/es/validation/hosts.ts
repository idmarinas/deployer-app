import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otro servidor con el mismo nombre.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
	host: {
		required: 'Debes introducir una dirección IPv4 o IPv6 válida.',
		ipv4: 'Debes introducir una dirección IPv4 válida.',
		ipv6: 'Debes introducir una dirección IPv6 válida.',
	},
	port: {
		min: 'El puerto debe ser mayor o igual a 0.',
		max: 'El puerto debe ser menor o igual a 65535.',
	},
	auth_type: {
		required: 'Debes seleccionar un tipo de autenticación.',
	},
	username: {
		required: 'Debes introducir el nombre de usuario del servidor.',
	},
	password: {
		required: 'Debes introducir la contraseña del usuario del servidor.',
	},
	key: {
		required: 'Debes seleccionar una clave del servidor.',
	},
} satisfies LocaleMessageValue
