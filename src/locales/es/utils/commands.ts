import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		not_found: 'No se encontró el comando "{key}" en la base de datos.',
		disabled: 'El comando "{key}" está deshabilitado y no se puede ejecutar.',
	},
} satisfies LocaleMessageValue
