import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo variable global...',
			description: 'Guardando la variable global en la base de datos...',
		},
		success: {
			title: 'Variable global añadida correctamente.',
			description: 'Variable global "{name}" añadida correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir la variable global.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir la variable global "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando variable global...',
			description: 'Actualizando la variable global en la base de datos...',
		},
		success: {
			title: 'Variable global actualizada correctamente.',
			description: 'Variable global "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la variable global.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la variable global "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando variable global...',
			description: 'Eliminando variable global "{name}" de la base de datos...',
		},
		success: {
			title: 'Variable global eliminada correctamente.',
			description: 'Variable global "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la variable global.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la variable global "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
