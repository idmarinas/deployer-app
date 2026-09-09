import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Access keys',
	table: {
		columns: {
			name: 'Name',
			type: 'Type',
			fingerprint: 'Fingerprint',
		},
	},
	toast: {
		delete: {
			loading: {
				title: 'Deleting access key...',
				description: 'Deleting access key {name}...',
			},
			success: {
				title: 'Access key deleted',
				description: 'Access key {name} deleted successfully',
			},
			error: {
				title: 'Error deleting access key',
				description: 'Error deleting access key {name}',
			},
		},
	},
} satisfies LocaleMessageValue