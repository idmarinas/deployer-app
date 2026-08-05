import type { LocaleMessageValue } from 'vue-i18n'

export default {
	added: 'Docker compose "{name}" añadido correctamente.',
	updated: 'Docker compose "{name}" actualizado correctamente.',
	deleted: 'Docker compose "{name}" eliminado correctamente.',
	invalid_images: 'Las siguientes imágenes no existen en Docker Hub: {images}',

	files: {
		upload_success: 'Archivos subidos correctamente.',
		create_success: 'Archivo "{file_path}" creado correctamente.',
		delete_success: 'Archivo "{file_path}" eliminado correctamente.',
		update_success: 'Archivo "{file_path}" actualizado correctamente.',
		delete_error: 'Error al eliminar el archivo.',
		upload_error: 'Error al subir los archivos.',
	},

	delete: {
		loading: {
			title: 'Eliminando docker compose...',
			description: 'Eliminando docker compose "{name}" de la base de datos...',
		},
		success: {
			title: 'Docker compose eliminado correctamente.',
			description: 'Docker compose "{name}" eliminado correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el docker compose.',
			description: 'Error al eliminar el docker compose "{name}" de la base de datos.',
		},
	},
} satisfies LocaleMessageValue
