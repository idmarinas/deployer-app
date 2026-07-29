import { HostPackage } from '@/types/tauri-types'
import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	confirm_update: {
		title: 'Confirmar actualización de <em>{package}</em> | Confirmar actualización de <em>{count}</em> paquetes',
		description: (ctx: MessageContext) => {
			const pkg = ctx.named('package') as HostPackage
			const count = ctx.named('count')

			if (count === 1) {
				return `<p>Se va a actualizar el paquete <strong>${pkg.name}</strong> en el servidor <strong>${ctx.named('server_name')}</strong></p>
        <br />
        <p>Versión actual "<span class="text-warning">${pkg.current_version}</span>" -> nueva versión "<span class="text-success">${pkg.available_version}</span>"</p>
        `
			}

			const pkgs = ctx.named('packages') as HostPackage[]

			return `<p>Se van a actualizar <strong>${count}</strong> paquetes en el servidor <strong>${ctx.named('server_name')}</strong></p>
      <br />
      <ul>
        ${pkgs
					.map(
						pkg =>
							`<li><strong>${pkg.name}</strong>: <span class="text-warning">${pkg.current_version}</span> -> <span class="text-success">${pkg.available_version}</span></li>`,
					)
					.join('')}
      </ul>
      `
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
				let msg = `Error al eliminar el servidor "${ctx.named('name')}" de la base de datos`
				const reason = ctx.named('reason')

				if (reason) {
					msg = `${msg}.\nRazón: ${reason}`
				}

				return msg
			},
		},
	},
} satisfies LocaleMessageValue
