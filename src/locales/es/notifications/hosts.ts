import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Añadiendo servidor...',
			description: 'Guardando el servidor en la base de datos...',
		},
		success: {
			title: 'Servidor añadido correctamente.',
			description: 'Servidor "{name}" añadido correctamente en la base de datos.',
		},
		error: {
			title: 'Error al añadir el servidor.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al añadir el servidor "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Actualizando servidor...',
			description: 'Actualizando el servidor en la base de datos...',
		},
		success: {
			title: 'Servidor actualizado correctamente.',
			description: 'Servidor "{name}" actualizado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al actualizar el servidor.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al actualizar el servidor "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},

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
				const details = ctx.named('details')
				const base = `Error al eliminar el servidor "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},

	restore: {
		loading: {
			title: 'Restaurando servidor...',
			description: 'Restaurando el servidor "{name}" en la base de datos...',
		},
		success: {
			title: 'Servidor restaurado correctamente.',
			description: 'Servidor "{name}" restaurado correctamente en la base de datos.',
		},
		error: {
			title: 'Error al restaurar el servidor.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al restaurar el servidor "${ctx.named('name')}" en la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},

	purge: {
		loading: {
			title: 'Eliminando servidor definitivamente...',
			description: 'Borrando el servidor "{name}" de la base de datos...',
		},
		success: {
			title: 'Servidor eliminado definitivamente.',
			description: 'Servidor "{name}" eliminado definitivamente de la base de datos.',
		},
		error: {
			title: 'Error al eliminar el servidor definitivamente.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error al eliminar definitivamente el servidor "${ctx.named('name')}" de la base de datos.`

				return details ? `${base} Detalles: ${details}` : base
			},
		},
	},

	purgeAll: {
		loading: {
			title: 'Eliminando borrados...',
			description: 'Eliminando definitivamente los servidores marcados como borrados...',
		},
		success: {
			title: 'Eliminados elementos borrados.',
			description: 'Servidores eliminados: {purged}. Bloqueados por referencias: {blocked}.',
		},
		warning: {
			title: 'Algunos servidores no se pudieron eliminar.',
			description: '{blocked} servidor(es) siguen bloqueados por tener referencias.',
		},
		error: {
			title: 'Error al eliminar los elementos borrados.',
			description: 'Se eliminaron {purged} y quedaron {blocked} bloqueados. Detalles: {details}',
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
		fingerprint: {
			title: 'Confirmar huella del servidor',
			description:
				'El servidor "{name}" presentó la huella {fingerprint}. Confírmala para guardarla y permitir futuras conexiones.',
			success: {
				title: 'Huella confirmada',
				description: 'Huella del servidor "{name}" guardada correctamente.',
			},
		},
		fingerprint_changed: {
			title: 'La huella del servidor ha cambiado',
			description:
				'La huella guardada de "{name}" era {current}, pero ahora presenta {fingerprint}. Confirma el cambio solo si es legítimo.',
			success: {
				title: 'Huella actualizada',
				description: 'Nueva huella del servidor "{name}" guardada correctamente.',
			},
		},
		cancelled: {
			title: 'Confirmación cancelada',
			description:
				'No se guardó la huella de "{name}". Las conexiones seguirán bloqueadas hasta que la confirmes.',
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
