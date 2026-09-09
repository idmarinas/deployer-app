import type { LocaleMessageValue } from 'vue-i18n'

export default {
	generate: {
		title: 'Generate access key',
		description: 'Generates a new access key for the host',
	},
	copy_to_host: {
		title: 'Copy access key to a host',
		description:
			'Copies access key "{name}" to a host. The key will be copied for the user configured on the host.',
	},
	title: {
		add: 'Add access key',
		edit: 'Edit access key',
	},
	name: {
		label: 'Name',
		help: 'Unique name that will identify the access key',
	},
	key_type: {
		label: 'Type',
		help: 'Access key type',
		select: {
			rsa: {
				label: 'RSA — Maximum compatibility',
				description: 'Compatible with legacy hosts. Large key and slow operations. Use 4096 bits.',
			},
			ed25519: {
				label: 'Ed25519 — Recommended',
				description: 'Modern, fast and very secure. Compatible with most current hosts.',
			},
			ecdsa: {
				label: 'ECDSA — Limited use',
				description: 'Secure but sensitive to random generator failures. Less recommended than Ed25519.',
			},
		},
	},
	key_content: {
		label: 'Content',
		help: 'Content of the private key',
	},
	passphrase: {
		label: 'Passphrase',
		help: 'Passphrase of the access key',
	},
	description: {
		label: 'Description',
		help: 'Optional description to remember the purpose of the access key',
	},
	fingerprint: {
		label: 'Fingerprint',
		help: 'Fingerprint of the private key',
	},
	server: {
		only_enabled: {
			label: 'Only enabled hosts',
		},
		label: 'Host',
		help: 'Host where the access key will be installed or removed',
	},
} satisfies LocaleMessageValue