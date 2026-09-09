import { HostPackage } from '@/types/tauri-types'
import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	confirm_update: {
		title: 'Confirm updating <em>{package}</em> | Confirm updating <em>{count}</em> packages',
		description: (ctx: MessageContext) => {
			const pkg = ctx.named('package') as HostPackage
			const count = ctx.named('count')

			if (count === 1) {
				return `<p>The package <strong>${pkg.name}</strong> is about to be updated on the host <strong>${ctx.named('server_name')}</strong></p>
        <br />
        <p>Current version "<span class="text-warning">${pkg.current_version}</span>" -> new version "<span class="text-success">${pkg.available_version}</span>"</p>
        `
			}

			const pkgs = ctx.named('packages') as HostPackage[]

			return `<p><strong>${count}</strong> packages are about to be updated on the host <strong>${ctx.named('server_name')}</strong></p>
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
			title: 'Deleting host...',
			description: 'Deleting host "{name}" from the database...',
		},
		success: {
			title: 'Host deleted successfully.',
			description: 'Host "{name}" deleted successfully from the database.',
		},
		error: {
			title: 'Error deleting the host.',
			description: (ctx: MessageContext) => {
				let msg = `Error deleting host "${ctx.named('name')}" from the database`
				const reason = ctx.named('reason')

				if (reason) {
					msg = `${msg}.\nReason: ${reason}`
				}

				return msg
			},
		},
	},
} satisfies LocaleMessageValue