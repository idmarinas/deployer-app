import type { LocaleMessageValue } from 'vue-i18n'

export default {
	created: 'Clave de acceso "{name}" creada correctamente.',
	added: 'Clave de acceso "{name}" añadida correctamente.',
	updated: 'Clave de acceso "{name}" actualizada correctamente.',
	deleted: 'Clave de acceso "{name}" eliminada correctamente.',

	delete: {
		loading: {
			title: 'Eliminando clave de acceso...',
			description: 'Eliminando clave de acceso "{name}" de la base de datos...',
		},
		success: {
			title: 'Clave de acceso eliminada correctamente.',
			description: 'Clave de acceso "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la clave de acceso.',
			description: 'Error al eliminar la clave de acceso "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
