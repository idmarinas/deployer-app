import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otra variable con el mismo nombre.',
	},
	slug: {
		required: 'Debes introducir un slug.',
		format: 'El slug solo puede contener minúsculas, números y guiones bajos.',
		min: 'El slug debe tener al menos 3 caracteres.',
		max: 'El slug debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otra variable con el mismo slug.',
	},
	value: {
		required: 'Debes introducir un valor cuando la variable está activa o es secreta.',
	},
	is_secret: {
		immutable: 'Una variable secreta no puede volver a ser pública.',
	},
} satisfies LocaleMessageValue
