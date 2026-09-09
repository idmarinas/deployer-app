import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Add host',
		edit: 'Edit host',
	},
	name: {
		label: 'Name',
		help: 'Unique name that will identify the host',
	},
	description: {
		label: 'Description',
		help: 'Optional description to remember the purpose of the host',
	},
	host: {
		label: 'Host',
		help: 'IP address or domain name of the host',
	},
	port: {
		label: 'Port',
		help: 'SSH connection port',
	},
	auth_type: {
		label: 'Authentication type',
		help: 'Authentication type for remote connection to the host',
		select: {
			password: 'Password',
			key: 'Access key',
		},
	},
	username: {
		label: 'Username',
		help: 'SSH user for remote connection. Required regardless of the authentication type.',
	},
	password: {
		label: 'Password',
		help: 'SSH password for remote connection',
	},
	key: {
		label: 'Key',
		help: 'SSH key for remote connection',
	},
	enabled: {
		label: 'Enabled',
		help: 'Indicates whether the host is enabled to receive deployments',
	},
} satisfies LocaleMessageValue