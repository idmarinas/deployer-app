import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		not_found: 'Command "{key}" was not found in the database.',
		disabled: 'Command "{key}" is disabled and cannot be executed.',
	},
} satisfies LocaleMessageValue
