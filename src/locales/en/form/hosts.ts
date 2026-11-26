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
	default_remote_path: {
		label: 'Base directory (file manager)',
		help: 'Initial path of the remote panel. It is not the command working directory; leave it empty to use “/”.',
		placeholder: '/var/www',
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
	host_key_fingerprint: {
		label: 'Host fingerprint',
		help: 'SHA256 fingerprint of the server key. It is obtained by testing the connection and must be confirmed.',
		check: 'Check and confirm',
		empty: 'Not confirmed',
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