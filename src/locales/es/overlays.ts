import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	dialog: {
		yes_no: {
			cancel: 'No',
			confirm: 'Sí',
		},
		cancel_confirm: {
			cancel: 'Cancelar',
			confirm: 'Confirmar',
		},
		cancel_delete: {
			cancel: 'Cancelar',
			confirm: 'Eliminar',
		},
		generate_passkey: {
			cancel: 'Cancelar',
			confirm: 'Generar',
		},
		passkey_to_server: {
			cancel: 'Cancelar',
			copy: 'Copiar al servidor',
			remove: 'Eliminar del servidor',
		},
	},
	toast: {
		title: {
			canceled: 'Operación cancelada',
			completed: 'Completado',
			error: 'Ha ocurrido un error',
			loading: 'Procesando...',
			success: 'Operación exitosa',
		},
		description: {
			canceled: (ctx: MessageContext) => {
				const reason = ctx.named('reason')
				return reason
					? `La operación ha sido cancelada. Motivo: ${reason}`
					: 'La operación ha sido cancelada por el usuario.'
			},
			completed: 'El proceso ha finalizado correctamente.',
			error: (ctx: MessageContext) => {
				const details = ctx.named('details')
				return details
					? `No se pudo completar la operación. Detalles: ${details}`
					: 'No se pudo completar la acción solicitada. Por favor, inténtalo de nuevo.'
			},
			loading: 'Por favor, espera mientras se completa la operación.',
			success: 'Los cambios se han guardado y aplicado correctamente.',
		},
	},
} satisfies LocaleMessageValue
