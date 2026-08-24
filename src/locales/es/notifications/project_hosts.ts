import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo servidor al proyecto...',
			description: 'Guardando el servidor del proyecto en la base de datos...',
		},
		success: {
			title: 'Servidor añadido al proyecto correctamente.',
			description: 'Servidor "{name}" añadido al proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir el servidor al proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir el servidor "${ctx.named('name')}" al proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando servidor del proyecto...',
			description: 'Actualizando el servidor del proyecto en la base de datos...',
		},
		success: {
			title: 'Servidor del proyecto actualizado correctamente.',
			description: 'Servidor "{name}" actualizado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar el servidor del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar el servidor "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando servidor del proyecto...',
			description: 'Eliminando servidor "{name}" del proyecto en la base de datos...',
		},
		success: {
			title: 'Servidor eliminado del proyecto correctamente.',
			description: 'Servidor "{name}" eliminado del proyecto correctamente en la base de datos.',
		},
		error: {
			title: 'Error al eliminar el servidor del proyecto.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar el servidor "${ctx.named('name')}" del proyecto en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
