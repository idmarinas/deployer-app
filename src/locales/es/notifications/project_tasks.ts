import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo tarea al proyecto...',
			description: 'Guardando la tarea del proyecto en la base de datos...',
		},
		success: {
			title: 'Tarea añadida al proyecto correctamente.',
			description: 'Tarea "{name}" añadida al proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir la tarea al proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir la tarea "${ctx.named('name')}" al proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando tarea del proyecto...',
			description: 'Actualizando la tarea del proyecto en la base de datos...',
		},
		success: {
			title: 'Tarea del proyecto actualizada correctamente.',
			description: 'Tarea "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la tarea del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la tarea "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando tarea del proyecto...',
			description: 'Eliminando tarea "{name}" del proyecto en la base de datos...',
		},
		success: {
			title: 'Tarea eliminada del proyecto correctamente.',
			description: 'Tarea "{name}" eliminada del proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al eliminar la tarea del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la tarea "${ctx.named('name')}" del proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
