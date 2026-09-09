import type { LocaleMessageValue } from 'vue-i18n'

export default {
	summary: {
		enabled: '1 enabled | {count} enabled',
		disabled: '1 disabled | {count} disabled',
		hosts: {
			title: 'Hosts',
		},
		passkeys: {
			title: 'Access keys',
		},
	},
	last_items: {
		empty: 'Nothing to show',
		hosts: {
			title: 'Latest hosts',
		},
		passkeys: {
			title: 'Latest access keys',
		},
	},
} satisfies LocaleMessageValue