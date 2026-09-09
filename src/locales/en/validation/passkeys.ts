import type { LocaleMessageValue } from 'vue-i18n'

export default {
	name: {
		required: 'You must enter a name.',
		min: 'The name must have at least 3 characters.',
		max: 'The name must be less than 120 characters.',
		not_unique: 'Another access key with the same name already exists.',
	},
	key_type: {
		required: 'You must select an access key type.',
	},
	key_content: {
		required: 'You must enter the private key content.',
		not_empty: 'The private key content cannot be empty.',
	},
	passphrase: {
		required: 'You must enter the access key passphrase.',
	},
	description: {
		max: 'The description must be less than 1000 characters.',
	},
	passkey_id: {
		required: 'You must select an access key.',
	},
	host: {
		required: 'You must select a host.',
	},
	action: {
		required: 'You must select an action.',
	},
} satisfies LocaleMessageValue