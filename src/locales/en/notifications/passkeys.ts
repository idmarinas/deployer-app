import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creating access key...',
			description: 'Saving the access key to the database...',
		},
		success: {
			title: 'Access key created successfully.',
			description: 'Access key "{name}" (ID: {id}) created successfully in the database.',
		},
		error: {
			title: 'Error creating the access key.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error creating access key "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Updating access key...',
			description: 'Updating the access key in the database...',
		},
		success: {
			title: 'Access key updated successfully.',
			description: 'Access key "{name}" updated successfully in the database.',
		},
		error: {
			title: 'Error updating the access key.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error updating access key "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Deleting access key...',
			description: 'Deleting access key "{name}" from the database...',
		},
		success: {
			title: 'Access key deleted successfully.',
			description: 'Access key "{name}" deleted successfully from the database.',
		},
		error: {
			title: 'Error deleting the access key.',
			referenced: {
				title: 'An access key that is in use cannot be deleted.',
				description: 'Access key "{name}" is assigned to one or more hosts. Unlink it before deleting it.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error deleting access key "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	restore: {
		loading: {
			title: 'Restoring access key...',
			description: 'Restoring access key "{name}" in the database...',
		},
		success: {
			title: 'Access key restored successfully.',
			description: 'Access key "{name}" restored successfully in the database.',
		},
		error: {
			title: 'Error restoring the access key.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error restoring access key "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	purge: {
		loading: {
			title: 'Permanently deleting access key...',
			description: 'Deleting access key "{name}" from the database...',
		},
		success: {
			title: 'Access key permanently deleted.',
			description: 'Access key "{name}" was permanently deleted from the database.',
		},
		error: {
			title: 'Error permanently deleting the access key.',
			referenced: {
				title: 'An access key that is in use cannot be deleted.',
				description: 'Access key "{name}" is assigned to one or more hosts. Unlink it before deleting it.',
			},
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error permanently deleting access key "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	purgeAll: {
		loading: {
			title: 'Removing deleted items...',
			description: 'Permanently deleting the access keys marked as deleted...',
		},
		success: {
			title: 'Deleted items removed.',
			description: 'Deleted access keys: {purged}. Blocked by references: {blocked}.',
		},
		warning: {
			title: 'Some access keys could not be deleted.',
			description: '{blocked} access key(s) could not be removed because they are assigned to hosts.',
		},
		error: {
			title: 'Error removing deleted items.',
			description: '{purged} were deleted and {blocked} remain blocked. Details: {details}',
		},
	},
	validation: {
		loading: {
			title: 'Validating access key...',
			description: 'Verifying the private key and deriving its fingerprint...',
		},
		error: {
			title: 'Error validating the access key.',
			description: 'The private key could not be validated. Check that the key and the passphrase are correct.',
		},
	},
} satisfies LocaleMessageValue