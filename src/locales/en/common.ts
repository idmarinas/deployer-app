import type { LocaleMessageValue } from 'vue-i18n'

export default {
	status: {
		active: 'Active',
		inactive: 'Inactive',
		enabled: 'Enabled',
		disabled: 'Disabled',
	},

	deploy: {
		can: 'Can deploy to this host',
		cannot: 'Cannot deploy to this host',
	},

	actions: {
		view: 'View',
		edit: 'Edit',
		save: 'Save',
		create: 'Create',
		list: 'List',
		delete: 'Delete',
		confirm: 'Confirm',
		cancel: 'Cancel',
		refresh: 'Refresh',
		filter: 'Filter',
		enable: 'Enable',
		disable: 'Disable',
	},

	confirm: {
		delete: {
			label: 'Delete',
			description: 'Are you sure you want to delete "{name}"?',
		},
	},

	empty: {
		label: 'Empty',
		description: 'No description provided',
		passphrase: 'Not protected with a password',
	},

	semver: {
		patch: 'Patch',
		minor: 'Minor',
		major: 'Major',
		security: 'Security',
	},

	common: {
		none: 'None',
		username: 'Username',
		encrypted: 'Encrypted',
		last_check: 'Last check',
		yes: 'Yes',
		no: 'No',
		deprecated: 'Deprecated',
	},

	back: {
		list: 'Back to list',
	},

	table: {
		columns: 'Columns',
	},
} satisfies LocaleMessageValue