import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'You must enter a name.',
		min: 'The name must have at least 3 characters.',
		max: 'The name must be less than 120 characters.',
		not_unique: 'Another host with the same name already exists.',
	},
	description: {
		max: 'The description must be less than 1000 characters.',
	},
	host: {
		required: 'You must enter a valid IPv4 or IPv6 address.',
		ipv4: 'You must enter a valid IPv4 address.',
		ipv6: 'You must enter a valid IPv6 address.',
	},
	port: {
		min: 'The port must be greater than or equal to 0.',
		max: 'The port must be less than or equal to 65535.',
	},
	auth_type: {
		required: 'You must select an authentication type.',
	},
	username: {
		required: 'You must enter the host username.',
	},
	password: {
		required: 'You must enter the host user password.',
	},
	key: {
		required: 'You must select a host key.',
	},
} satisfies LocaleMessageValue