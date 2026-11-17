import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creating command...',
			description: 'Saving the command in the database...',
		},
		success: {
			title: 'Command created successfully.',
			description: 'Command "{name}" created successfully in the database.',
		},
		error: {
			title: 'Error creating the command.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error creating the command "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Updating command...',
			description: 'Updating the command in the database...',
		},
		success: {
			title: 'Command updated successfully.',
			description: 'Command "{name}" updated successfully in the database.',
		},
		error: {
			title: 'Error updating the command.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error updating the command "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Deleting command...',
			description: 'Deleting command "{name}" from the database...',
		},
		success: {
			title: 'Command deleted successfully.',
			description: 'Command "{name}" deleted successfully from the database.',
		},
		error: {
			title: 'Error deleting the command.',
			internal: {
				title: 'An internal command cannot be deleted.',
				description: 'The internal command "{name}" cannot be deleted from the database.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error deleting the command "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	restore: {
		loading: {
			title: 'Restoring command...',
			description: 'Restoring command "{name}" in the database...',
		},
		success: {
			title: 'Command restored successfully.',
			description: 'Command "{name}" restored successfully in the database.',
		},
		error: {
			title: 'Error restoring the command.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error restoring the command "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	purge: {
		loading: {
			title: 'Permanently deleting command...',
			description: 'Deleting command "{name}" from the database...',
		},
		success: {
			title: 'Command permanently deleted.',
			description: 'Command "{name}" was permanently deleted from the database.',
		},
		error: {
			title: 'Error permanently deleting the command.',
			internal: {
				title: 'An internal command cannot be deleted.',
				description: 'The internal command "{name}" cannot be deleted from the database.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error permanently deleting the command "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	purgeAll: {
		loading: {
			title: 'Removing deleted items...',
			description: 'Permanently deleting the commands marked as deleted...',
		},
		success: {
			title: 'Deleted items removed.',
			description: 'Deleted commands: {purged}. Blocked: {blocked}.',
		},
		warning: {
			title: 'Some commands could not be deleted.',
			description: '{blocked} command(s) could not be removed because they are internal or referenced.',
		},
		error: {
			title: 'Error removing deleted items.',
			description: '{purged} were deleted and {blocked} remain blocked. Details: {details}',
		},
	},
} satisfies LocaleMessageValue