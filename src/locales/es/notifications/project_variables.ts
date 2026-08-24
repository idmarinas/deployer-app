import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo variable al proyecto...',
			description: 'Guardando la variable del proyecto en la base de datos...',
		},
		success: {
			title: 'Variable añadida al proyecto correctamente.',
			description: 'Variable "{name}" añadida al proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir la variable al proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir la variable "${ctx.named('name')}" al proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando variable del proyecto...',
			description: 'Actualizando la variable del proyecto en la base de datos...',
		},
		success: {
			title: 'Variable del proyecto actualizada correctamente.',
			description: 'Variable "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la variable del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la variable "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando variable del proyecto...',
			description: 'Eliminando variable "{name}" del proyecto en la base de datos...',
		},
		success: {
			title: 'Variable eliminada del proyecto correctamente.',
			description: 'Variable "{name}" eliminada del proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al eliminar la variable del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la variable "${ctx.named('name')}" del proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
