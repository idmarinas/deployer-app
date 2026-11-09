import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		min: 'The name must be at least 3 characters long.',
		max: 'The name must be less than 120 characters long.',
		not_unique: 'Another variable with the same name already exists.',
	},
	slug: {
		required: 'You must enter a slug.',
		format: 'The slug can only contain lowercase letters, numbers and underscores.',
		min: 'The slug must be at least 3 characters long.',
		max: 'The slug must be less than 120 characters long.',
		not_unique: 'Another variable with the same slug already exists.',
	},
	value: {
		required: 'You must enter a value when the variable is enabled or secret.',
	},
} satisfies LocaleMessageValue
