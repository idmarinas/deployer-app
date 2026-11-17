import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		scope_not_available: 'El ámbito "{scope}" no está disponible en este contexto.',
		unknown_variable: 'La variable "{path}" no existe o fue eliminada.',
		disabled_variable: 'La variable "{path}" está deshabilitada.',
		secret_variable: 'La variable "{path}" es secreta y no puede mostrarse en este contexto.',
		invalid_path: 'La ruta "{path}" no es válida. Debe tener la forma ámbito.ruta, sin espacios.',
		decrypt_failed: 'No se pudo descifrar la variable secreta "{path}".',
		read_failed: 'No se pudieron leer las variables globales.',
	},
	warnings: {
		secret_variable: 'La variable "{path}" es secreta: se resolverá solo al ejecutar.',
	},
} satisfies LocaleMessageValue
