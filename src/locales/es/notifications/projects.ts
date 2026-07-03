import type { LocaleMessageValue } from 'vue-i18n'

export default {
	created: 'Proyecto "{name}" creado correctamente.',
	added: 'Proyecto "{name}" añadido correctamente.',
	updated: 'Proyecto "{name}" actualizado correctamente.',
	deleted: 'Proyecto "{name}" eliminado correctamente.',

	delete: {
		loading: {
			title: 'Eliminando proyecto...',
			description: 'Eliminando proyecto "{name}" de la base de datos...',
		},
		success: {
			title: 'Proyecto eliminado correctamente.',
			description: 'Proyecto "{name}" eliminado correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el proyecto.',
			description: 'Error al eliminar el proyecto "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
