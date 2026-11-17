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
			internal: {
				title: 'No se puede eliminar un comando interno.',
				description: 'El comando interno "{name}" no se puede eliminar de la base de datos.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar el comando "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	restore: {
		loading: {
			title: 'Restaurando comando...',
			description: 'Restaurando el comando "{name}" en la base de datos...',
		},
		success: {
			title: 'Comando restaurado correctamente.',
			description: 'Comando "{name}" restaurado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al restaurar el comando.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al restaurar el comando "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	purge: {
		loading: {
			title: 'Eliminando comando definitivamente...',
			description: 'Borrando el comando "{name}" de la base de datos...',
		},
		success: {
			title: 'Comando eliminado definitivamente.',
			description: 'Comando "{name}" eliminado definitivamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el comando definitivamente.',
			internal: {
				title: 'No se puede eliminar un comando interno.',
				description: 'El comando interno "{name}" no se puede eliminar de la base de datos.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar definitivamente el comando "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	purgeAll: {
		loading: {
			title: 'Eliminando borrados...',
			description: 'Eliminando definitivamente los comandos marcados como borrados...',
		},
		success: {
			title: 'Eliminados elementos borrados.',
			description: 'Comandos eliminados: {purged}. Bloqueados: {blocked}.',
		},
		warning: {
			title: 'Algunos comandos no se pudieron eliminar.',
			description: '{blocked} comando(s) siguen bloqueados por ser internos o tener referencias.',
		},
		error: {
			title: 'Error al eliminar los elementos borrados.',
			description: 'Se eliminaron {purged} y quedaron {blocked} bloqueados. Detalles: {details}',
		},
	},
} satisfies LocaleMessageValue