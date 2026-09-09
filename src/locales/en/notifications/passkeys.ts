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
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error deleting access key "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
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