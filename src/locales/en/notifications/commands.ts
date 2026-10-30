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
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error deleting the command "${ctx.named('name')}" from the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue