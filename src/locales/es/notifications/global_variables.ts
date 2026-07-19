import type { LocaleMessageValue } from 'vue-i18n'

export default {
	added: 'Variable global "{name}" añadida correctamente.',
	updated: 'Variable global "{name}" actualizada correctamente.',
	deleted: 'Variable global "{name}" eliminada correctamente.',

	delete: {
		loading: {
			title: 'Eliminando variable global...',
			description: 'Eliminando variable global "{name}" de la base de datos...',
		},
		success: {
			title: 'Variable global eliminada correctamente.',
			description: 'Variable global "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la variable global.',
			description: 'Error al eliminar la variable global "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
