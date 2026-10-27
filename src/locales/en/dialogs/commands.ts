import type { LocaleMessageValue } from 'vue-i18n'

export default {
	test: {
		title: 'Test command',
		host: {
			label: 'Host',
			help: 'Host where the command will run',
		},
		run: 'Run',
	},
} satisfies LocaleMessageValue