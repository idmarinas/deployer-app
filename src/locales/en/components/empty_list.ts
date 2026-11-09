import type { LocaleMessageValue } from 'vue-i18n'

export default {
	passkeys: {
		title: 'No access keys found',
		description: 'It looks like you have not added any access keys. Create one to get started.',
		add: {
			label: 'Add access key',
			description: 'Add a new access key to deploy to the hosts.',
		},
	},
	hosts: {
		title: 'No hosts found',
		description: 'It looks like you have not added any hosts. Create one to get started.',
		add: {
			label: 'Add host',
			description: 'Add a new host to which projects can be deployed.',
		},
	},
	commands: {
		title: 'No commands found',
		description: 'It looks like you have not added any commands. Create one to get started.',
		add: {
			label: 'Add command',
			description: 'Add a new reusable command to run on the hosts.',
		},
	},
	variables: {
		title: 'No variables found',
		description: 'It looks like you have not added any variables. Create one to get started.',
		add: {
			label: 'Add variable',
			description: 'Add a new reusable global variable.',
		},
	},
} satisfies LocaleMessageValue