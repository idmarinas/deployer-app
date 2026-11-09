import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	create: {
		loading: {
			title: 'Creating variable...',
			description: 'Saving the variable to the database...',
		},
		success: {
			title: 'Variable created successfully.',
			description: 'Variable "{name}" (ID: {id}) was created successfully in the database.',
		},
		error: {
			title: 'Error creating the variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error creating the variable "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	update: {
		loading: {
			title: 'Updating variable...',
			description: 'Updating the variable in the database...',
		},
		success: {
			title: 'Variable updated successfully.',
			description: 'Variable "{name}" was updated successfully in the database.',
		},
		error: {
			title: 'Error updating the variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const base = `Error updating the variable "${ctx.named('name')}" in the database.`

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
	delete: {
		loading: {
			title: 'Deleting variable...',
			description: 'Deleting the variable from the database...',
		},
		success: {
			title: 'Variable deleted successfully.',
			description: 'Variable "{name}" was deleted successfully from the database.',
		},
		error: {
			title: 'Error deleting the variable.',
			description: (ctx: MessageContext) => {
				const details = ctx.named('details')
				const name = ctx.named('name') as string | undefined
				const base = name
					? `Error deleting the variable "${name}" from the database.`
					: 'Error deleting the variable from the database.'

				return details ? `${base} Details: ${details}` : base
			},
		},
	},
} satisfies LocaleMessageValue
