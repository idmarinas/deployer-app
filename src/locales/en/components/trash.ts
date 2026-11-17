import type { LocaleMessageValue } from 'vue-i18n'

export default {
	columns: {
		deleted_at: 'Deleted at',
	},
	empty: {
		title: 'Trash is empty',
		list_title: 'No deleted items',
		description: 'There are no deleted items in this table.',
	},
} satisfies LocaleMessageValue
