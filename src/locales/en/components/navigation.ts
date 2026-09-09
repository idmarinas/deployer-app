import type { LocaleMessageValue } from 'vue-i18n'

export default {
	add: {
		project: {
			label: 'Add project',
			description: 'Add a new project to manage deployments.',
		},
		task: {
			label: 'Add global task',
			description: 'Add a new reusable global task.',
		},
		passkey: {
			label: 'Add access key',
			description: 'Add a new access key to deploy to the hosts.',
		},
		host: {
			label: 'Add host',
			description: 'Add a new host to which projects can be deployed.',
		},
		variable: {
			label: 'Add global variable',
			description: 'Add a new reusable global variable.',
		},
		docker_compose: {
			label: 'Add docker compose',
			description: 'Add a new docker compose to manage containers.',
		},
	},
	toolbar: {
		list: 'List',
		add: 'Add',
		edit: 'Edit',
	},
} satisfies LocaleMessageValue