import type { LocaleMessageValue } from 'vue-i18n'

export default {
	not_found: {
		default: {
			statusMessage: 'No encontrado',
			message: 'No se ha podido encontrar lo que estabas buscando.',
		},
		host: {
			statusMessage: 'Servidor no encontrado',
			message: 'No se ha podido encontrar el servidor que estabas buscando.',
		},
		project: {
			statusMessage: 'Proyecto no encontrado',
			message: 'No se ha podido encontrar el proyecto que estabas buscando.',
		},
		passkey: {
			statusMessage: 'Clave de acceso no encontrada',
			message: 'No se ha podido encontrar la clave de acceso que estabas buscando.',
		},
		variable: {
			statusMessage: 'Variable no encontrada',
			message: 'No se ha podido encontrar la variable que estabas buscando.',
		},
		task: {
			statusMessage: 'Tarea no encontrada',
			message: 'No se ha podido encontrar la tarea que estabas buscando.',
		},
		deployment: {
			statusMessage: 'Despliegue no encontrado',
			message: 'No se ha podido encontrar el despiegue que estabas buscando.',
		},
	},
	unknown: {
		statusMessage: 'Error desconocido',
		message: 'Se ha producido un error y no se ha podido procesar la petición.',
	},
} satisfies LocaleMessageValue
