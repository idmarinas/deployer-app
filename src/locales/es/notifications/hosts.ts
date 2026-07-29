import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	added: 'Servidor "{name}" añadido correctamente.',
	updated: 'Servidor "{name}" actualizado correctamente.',
	deleted: 'Servidor "{name}" eliminado correctamente.',

	delete: {
		loading: {
			title: 'Eliminando servidor...',
			description: 'Eliminando servidor "{name}" de la base de datos...',
		},
		success: {
			title: 'Servidor eliminado correctamente.',
			description: 'Servidor "{name}" eliminado correctamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el servidor.',
			description: (ctx: MessageContext) => {
				let msg = `Error al eliminar el servidor "${ctx.named('name')}" de la base de datos`
				const reason = ctx.named('reason')

				if (reason) {
					msg = `${msg}.\nRazón: ${reason}`
				}

				return msg
			},
		},
	},

	test_connection: {
		loading: {
			title: 'Probando conexión',
			description: 'Se está comprobando que se puede conectar al servidor "{name}"',
		},
		success: {
			title: 'Conexión exitosa',
			description: 'Se ha establecido conexión con el servidor "{name}"',
		},
		error: {
			title: 'Error al conectar',
			description: 'No se ha podido establecer conexión con el servidor "{name}". \nRazón: {reason}',
		},
	},

	system_info: {
		loading: {
			title: 'Comprobando información del sistema',
			description: 'Obteniendo información del servidor "{name}"',
		},
		success: {
			title: 'Información obtenida',
			description: 'Información del servidor "{name}" actualizada',
		},
		error: {
			title: 'Error al comprobar información',
			description: 'No se ha podido obtener la información del servidor "{name}". \nRazón: {reason}',
		},
	},

	status_info: {
		loading: {
			title: 'Comprobando estado',
			description: 'Obteniendo información del servidor "{name}"',
		},
		success: {
			title: 'Estado obtenido',
			description: 'Información del servidor "{name}" actualizada',
		},
		error: {
			title: 'Error al comprobar estado',
			description: 'No se ha podido obtener el estado del servidor "{name}". \nRazón: {reason}',
		},
	},
	check_updates: {
		loading: {
			title: 'Buscando actualizaciones',
			description: 'Comprobando actualizaciones disponibles en "{name}"',
		},
		success: {
			title: 'Sistema actualizado | Actualización encontrada | Actualizaciones encontradas',
			description:
				'No hay actualizaciones disponibles en "{name}" | 1 actualización disponible en "{name}" | {count} actualizaciones disponibles en "{name}"',
		},
		error: {
			title: 'Error al buscar actualizaciones',
			description: 'No se han podido buscar actualizaciones en "{name}". \nRazón: {reason}',
		},
	},
} satisfies LocaleMessageValue
