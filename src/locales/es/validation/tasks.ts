import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otra tarea con el mismo nombre.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
	task_type: {
		required: 'Debes seleccionar un tipo de tarea.',
	},
	command: {
		max: 'El comando debe tener menos de 10000 caracteres.',
		required: 'Debes introducir un comando o script para este tipo de tarea.',
	},
	timeout: {
		min: 'El timeout debe ser mayor o igual a 1 segundo.',
		max: 'El timeout debe ser menor o igual a 86400 segundos (24h).',
	},
	retry_count: {
		min: 'El número de reintentos debe ser mayor o igual a 0.',
		max: 'El número de reintentos debe ser menor o igual a 20.',
	},
	retry_delay: {
		min: 'La espera entre reintentos debe ser mayor o igual a 0.',
		max: 'La espera entre reintentos debe ser menor o igual a 3600 segundos.',
	},
} satisfies LocaleMessageValue
