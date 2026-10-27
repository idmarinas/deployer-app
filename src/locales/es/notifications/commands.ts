import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creando comando...',
			description: 'Guardando el comando en la base de datos...',
		},
		success: {
			title: 'Comando creado correctamente.',
			description: 'Comando "{name}" creado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al crear el comando.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al crear el comando "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando comando...',
			description: 'Actualizando el comando en la base de datos...',
		},
		success: {
			title: 'Comando actualizado correctamente.',
			description: 'Comando "{name}" actualizado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar el comando.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar el comando "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando comando...',
			description: 'Eliminando comando "{name}" de la base de datos...',
		},
		success: {
			title: 'Comando eliminado correctamente.',
			description: 'Comando "{name}" eliminado correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el comando.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar el comando "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue