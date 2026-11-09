import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creando variable...',
			description: 'Guardando la variable en la base de datos...',
		},
		success: {
			title: 'Variable creada correctamente.',
			description: 'Variable "{name}" (ID: {id}) creada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al crear la variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al crear la variable "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando variable...',
			description: 'Actualizando la variable en la base de datos...',
		},
		success: {
			title: 'Variable actualizada correctamente.',
			description: 'Variable "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la variable "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando variable...',
			description: 'Eliminando la variable de la base de datos...',
		},
		success: {
			title: 'Variable eliminada correctamente.',
			description: 'Variable "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const name = ctx.named('name') as string | undefined
				const base = name
					? `Error al eliminar la variable "${name}" de la base de datos.`
					: 'Error al eliminar la variable de la base de datos.'

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
