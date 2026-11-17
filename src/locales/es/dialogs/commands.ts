import type { LocaleMessageValue } from 'vue-i18n'

export default {
	test: {
		title: 'Probar comando',
		host: {
			label: 'Servidor',
			help: 'Servidor donde se ejecutará el comando',
		},
		run: 'Ejecutar',
		loading_variables: 'Cargando variables globales…',
		load_error: 'No se pudieron cargar las variables globales; no se puede ejecutar.',
		preview: {
			label: 'Vista previa',
			tabs: {
				interpolated: 'Interpolada',
				original: 'Original',
			},
			secrets: 'Las variables secretas (marcadas como {marker}) se resuelven al ejecutar el comando.',
		},
		issues: {
			errors: 'Errores de interpolación',
		},
	},
} satisfies LocaleMessageValue
