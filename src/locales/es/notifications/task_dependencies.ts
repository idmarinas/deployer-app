import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo dependencia...',
			description: 'Guardando la dependencia en la base de datos...',
		},
		success: {
			title: 'Dependencia añadida correctamente.',
			description: 'Dependencia "{name}" añadida correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir la dependencia.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir la dependencia "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando dependencia...',
			description: 'Actualizando la dependencia en la base de datos...',
		},
		success: {
			title: 'Dependencia actualizada correctamente.',
			description: 'Dependencia "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la dependencia.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la dependencia "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando dependencia...',
			description: 'Eliminando dependencia "{name}" de la base de datos...',
		},
		success: {
			title: 'Dependencia eliminada correctamente.',
			description: 'Dependencia "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la dependencia.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la dependencia "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
