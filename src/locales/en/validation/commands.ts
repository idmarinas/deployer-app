import type { LocaleMessageValue } from 'vue-i18n'

export default {
	key: {
		required: 'You must provide a key for the command.',
		format: 'The key can only contain lowercase letters, numbers and underscores.',
		min: 'The key must be at least 3 characters long.',
		max: 'The key must be less than 64 characters long.',
		not_unique: 'Another command already uses the same key.',
	},
	name: {
		min: 'The name must be at least 3 characters long.',
		max: 'The name must be less than 120 characters long.',
		not_unique: 'Another command already uses the same name.',
	},
	command: {
		required: 'You must provide the command to run.',
	},
	timeout: {
		min: 'The timeout must be at least 1 second.',
		max: 'The timeout cannot exceed 3600 seconds.',
	},
} satisfies LocaleMessageValue