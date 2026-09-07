import type { LocaleMessageValue } from 'vue-i18n'

export default {
	summary: {
		enabled: '1 habilitado | {count} habilitados',
		disabled: '1 deshabilitado | {count} deshabilitados',
		hosts: {
			title: 'Servidores',
		},
		passkeys: {
			title: 'Claves de acceso',
		},
	},
	last_items: {
		hosts: {
			title: 'Últimos servidores',
		},
		passkeys: {
			title: 'Últimas claves de acceso',
		},
	},
} satisfies LocaleMessageValue
