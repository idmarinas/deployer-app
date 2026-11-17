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
		test: 'Test',
		undo: 'Undo',
		restore: 'Restore',
		purge: 'Delete permanently',
		purge_all: 'Empty trash',
		purge_deleted: 'Delete all deleted items',
		unlink_delete: 'Unlink and delete',
		delete_anyway: 'Delete anyway',
		continue: 'Continue',
	},

	tabs: {
		active: 'Active',
		inactive: 'Inactive',
		trash: 'Deleted',
	},

	confirm: {
		delete: {
			label: 'Delete',
			description: 'Are you sure you want to delete "{name}"?',
		},
		purge: {
			label: 'Delete permanently',
			description: '"{name}" will be permanently deleted. This action cannot be undone.',
			referenced_suffix: 'It will also be unlinked from the entities that use it.',
		},
		purge_all: {
			label: 'Empty trash',
			description: 'All rows in this table’s trash will be permanently deleted. This action cannot be undone.',
			confirm_title: 'Confirm emptying',
			confirm_description: 'Final confirmation: the rows will be removed from the database and cannot be recovered.',
		},
		purge_deleted: {
			label: 'Delete all deleted items',
			description: 'All deleted items in this table will be permanently deleted. This action cannot be undone.',
			confirm_title: 'Confirm deletion',
			confirm_description:
				'Final confirmation: the deleted items will be removed from the database and cannot be recovered.',
		},
		referenced: {
			intro: '"{name}" is referenced by:',
			suffix: 'If you continue, it will be unlinked from those entities.',
		},
		usages: {
			intro: '"{name}" is used in the following commands:',
			suffix: 'If you continue, those expressions will stop resolving when the commands run.',
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
		unknown: 'Unknown',
		packaging: 'Packaging',
		revision: 'Packaging revision: only the package changes, not the software',
	},

	common: {
		none: 'None',
		username: 'Username',
		encrypted: 'Encrypted',
		last_check: 'Last check',
		yes: 'Yes',
		no: 'No',
		deprecated: 'Deprecated',
		info: 'Information',
	},

	back: {
		list: 'Back to list',
	},

	table: {
		columns: 'Columns',
	},
} satisfies LocaleMessageValue
