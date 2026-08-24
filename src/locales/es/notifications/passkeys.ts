import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creando clave de acceso...',
			description: 'Guardando la clave de acceso en la base de datos...',
		},
		success: {
			title: 'Clave de acceso creada correctamente.',
			description: 'Clave de acceso "{name}" (ID: {id}) creada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al crear la clave de acceso.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al crear la clave de acceso "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando clave de acceso...',
			description: 'Actualizando la clave de acceso en la base de datos...',
		},
		success: {
			title: 'Clave de acceso actualizada correctamente.',
			description: 'Clave de acceso "{name}" actualizada correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar la clave de acceso.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar la clave de acceso "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Eliminando clave de acceso...',
			description: 'Eliminando clave de acceso "{name}" de la base de datos...',
		},
		success: {
			title: 'Clave de acceso eliminada correctamente.',
			description: 'Clave de acceso "{name}" eliminada correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar la clave de acceso.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar la clave de acceso "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	validation: {
		loading: {
			title: 'Validando clave de acceso...',
			description: 'Verificando la clave privada y derivando su fingerprint...',
		},
		error: {
			title: 'Error al validar la clave de acceso.',
			description: 'No se pudo validar la clave privada. Comprueba que la clave y la passphrase sean correctas.',
		},
	},
} satisfies LocaleMessageValue
