import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	invalid_images: 'Las siguientes imágenes no existen en Docker Hub: {images}',

	create: {
		loading: {
			title: 'Añadiendo docker compose...',
			description: 'Guardando el docker compose en la base de datos...',
		},
		success: {
			title: 'Docker compose añadido correctamente.',
			description: 'Docker compose "{name}" añadido correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir el docker compose.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir el docker compose "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando docker compose...',
			description: 'Actualizando el docker compose en la base de datos...',
		},
		success: {
			title: 'Docker compose actualizado correctamente.',
			description: 'Docker compose "{name}" actualizado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar el docker compose.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar el docker compose "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},

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
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar el docker compose "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
