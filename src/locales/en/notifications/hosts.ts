import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Adding host...',
			description: 'Saving the host to the database...',
		},
		success: {
			title: 'Host added successfully.',
			description: 'Host "{name}" added successfully to the database.',
		},
		error: {
			title: 'Error adding the host.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error adding host "${ctx.named('name')}" to the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Updating host...',
			description: 'Updating the host in the database...',
		},
		success: {
			title: 'Host updated successfully.',
			description: 'Host "{name}" updated successfully in the database.',
		},
		error: {
			title: 'Error updating the host.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error updating host "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},

	delete: {
		loading: {
			title: 'Deleting host...',
			description: 'Deleting host "{name}" from the database...',
		},
		success: {
			title: 'Host deleted successfully.',
			description: 'Host "{name}" deleted successfully from the database.',
		},
		error: {
			title: 'Error deleting the host.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error deleting host "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},

	test_connection: {
		loading: {
			title: 'Testing connection',
			description: 'Checking that host "{name}" can be reached',
		},
		success: {
			title: 'Connection successful',
			description: 'Connection with host "{name}" established',
		},
		error: {
			title: 'Connection error',
			description: 'Could not establish connection with host "{name}". \nReason: {reason}',
		},
	},

	system_info: {
		loading: {
			title: 'Checking system information',
			description: 'Getting information from host "{name}"',
		},
		success: {
			title: 'Information retrieved',
			description: 'Information from host "{name}" updated',
		},
		error: {
			title: 'Error checking information',
			description: 'Could not get the information from host "{name}". \nReason: {reason}',
		},
	},

	status_info: {
		loading: {
			title: 'Checking status',
			description: 'Getting information from host "{name}"',
		},
		success: {
			title: 'Status retrieved',
			description: 'Information from host "{name}" updated',
		},
		error: {
			title: 'Error checking status',
			description: 'Could not get the status from host "{name}". \nReason: {reason}',
		},
	},
	check_updates: {
		loading: {
			title: 'Checking for updates',
			description: 'Checking for available updates on "{name}"',
		},
		success: {
			title: '{count, plural, =0 {System up to date} one {1 update found} other {{count} updates found}}',
			description:
				'{count, plural, =0 {No updates available on "{name}"} one {1 update available on "{name}"} other {{count} updates available on "{name}"}}',
		},
		error: {
			title: 'Error checking for updates',
			description: 'Could not check for updates on "{name}". \nReason: {reason}',
		},
	},
} satisfies LocaleMessageValue