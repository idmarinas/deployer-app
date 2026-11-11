import type { LocaleMessageValue } from 'vue-i18n'

export default {
	test: {
		title: 'Test command',
		host: {
			label: 'Host',
			help: 'Host where the command will run',
		},
		run: 'Run',
		loading_variables: 'Loading global variables…',
		load_error: 'Global variables could not be loaded; execution is blocked.',
		preview: {
			label: 'Preview',
			tabs: {
				interpolated: 'Interpolated',
				original: 'Original',
			},
			secrets: 'Secret variables (shown as {marker}) are resolved when the command runs.',
		},
		issues: {
			errors: 'Interpolation errors',
		},
	},
} satisfies LocaleMessageValue
