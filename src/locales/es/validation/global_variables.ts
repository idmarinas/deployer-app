import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
	},
	slug: {
		required: 'Debes introducir un slug.',
		min: 'El slug debe tener al menos 3 caracteres.',
		max: 'El slug debe tener menos de 120 caracteres.',
		invalid: 'El slug solo puede contener minúsculas, números y guiones (ej. mi-variable).',
		not_unique: 'Ya existe otra variable global con el mismo slug.',
	},
	value: {
		required: 'Debes introducir un valor.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
} satisfies LocaleMessageValue
