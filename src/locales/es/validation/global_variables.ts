import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otra variable global con el mismo nombre.',
	},
	value: {
		required: 'Debes introducir un valor.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
} satisfies LocaleMessageValue
