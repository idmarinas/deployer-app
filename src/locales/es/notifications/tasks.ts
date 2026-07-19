import type { LocaleMessageValue } from 'vue-i18n'

export default {
	added: 'Tarea "{name}" añadida correctamente.',
	updated: 'Tarea "{name}" actualizada correctamente.',
	deleted: 'Tarea "{name}" eliminada correctamente.',

	delete: {
		loading: {
			title: 'Eliminando tarea...',
			description: 'Eliminando tarea "{name}" de la base de datos...',
		},
		success: {
			title: 'Tarea eliminada correctamente.',
			description: 'Tarea "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la tarea.',
			description: 'Error al eliminar la tarea "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
