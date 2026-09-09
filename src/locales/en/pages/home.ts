import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Dashboard',
	summary: {
		hosts: 'Hosts',
		passkeys: 'Access keys',
		docker_composes: 'Docker Compose',
		enabled: 'enabled',
	},
	recent: {
		hosts: 'Latest hosts',
		passkeys: 'Latest keys',
		docker_composes: 'Latest Docker Compose',
		view_all: 'View all',
		no_items: 'No items yet',
	},
	empty: {
		title: 'Welcome to DeployerApp',
		description: 'Start by adding your first resources to manage deployments.',
	},
} satisfies LocaleMessageValue