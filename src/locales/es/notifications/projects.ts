import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creando proyecto...',
			description: 'Guardando el proyecto en la base de datos...',
		},
		success: {
			title: 'Proyecto creado correctamente.',
			description: 'Proyecto "{name}" creado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al crear el proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al crear el proyecto "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando proyecto...',
			description: 'Actualizando el proyecto en la base de datos...',
		},
		success: {
			title: 'Proyecto actualizado correctamente.',
			description: 'Proyecto "{name}" actualizado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar el proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar el proyecto "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
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
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar el proyecto "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
