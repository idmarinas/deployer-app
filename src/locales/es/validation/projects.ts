import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'Debes introducir un nombre.',
		min: 'El nombre debe tener al menos 3 caracteres.',
		max: 'El nombre debe tener menos de 120 caracteres.',
		not_unique: 'Ya existe otro proyecto con el mismo nombre.',
	},
	description: {
		max: 'La descripción debe tener menos de 1000 caracteres.',
	},
	git_url: {
		required: 'Debes introducir la URL del repositorio del proyecto.',
		invalid: 'Debes introducir una URL válida.',
	},
	local_working_dir: {
		required: 'Debes introducir el directorio de trabajo local del proyecto.',
		invalid: 'Debes introducir un directorio de trabajo local válido.',
	},
	remote_working_dir: {
		required: 'Debes introducir el directorio de trabajo remoto del proyecto.',
		invalid: 'Debes introducir un directorio de trabajo remoto válido.',
	},
	framework: {
		required: 'Debes seleccionar un framework.',
	},
} satisfies LocaleMessageValue
