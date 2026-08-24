import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo tarea...',
			description: 'Guardando la tarea en la base de datos...',
		},
		success: {
			title: 'Tarea añadida correctamente.',
			description: 'Tarea "{name}" añadida correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir la tarea.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir la tarea "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando tarea...',
			description: 'Actualizando la tarea en la base de datos...',
		},
		success: {
			title: 'Tarea actualizada correctamente.',
			description: 'Tarea "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la tarea.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la tarea "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
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
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la tarea "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
