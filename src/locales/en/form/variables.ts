import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Add variable',
		edit: 'Edit variable',
	},
	name: {
		label: 'Name',
		help: 'Display name to identify the variable in the interface.',
	},
	slug: {
		label: 'Slug',
		help: 'Unique identifier used for interpolation. Lowercase letters, numbers and underscores only; it cannot be changed after creation.',
	},
	description: {
		label: 'Description',
		help: 'Optional description to remember the purpose of the variable.',
	},
	value: {
		label: 'Value',
		help: 'Value that will replace the variable when used.',
	},
	is_secret: {
		label: 'Is secret',
		help: 'Mark this option if the variable contains sensitive information (passwords, tokens, etc.).',
	},
} satisfies LocaleMessageValue
