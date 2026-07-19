import type { LocaleMessageValue } from 'vue-i18n'

export default {
	added: 'Servidor "{name}" añadido correctamente.',
	updated: 'Servidor "{name}" actualizado correctamente.',
	deleted: 'Servidor "{name}" eliminado correctamente.',

	delete: {
		loading: {
			title: 'Eliminando servidor...',
			description: 'Eliminando servidor "{name}" de la base de datos...',
		},
		success: {
			title: 'Servidor eliminado correctamente.',
			description: 'Servidor "{name}" eliminado correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el servidor.',
			description: 'Error al eliminar el servidor "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
