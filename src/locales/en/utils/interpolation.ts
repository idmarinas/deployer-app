import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		scope_not_available: 'Scope "{scope}" is not available in this context.',
		unknown_variable: 'Variable "{path}" does not exist or was deleted.',
		disabled_variable: 'Variable "{path}" is disabled.',
		secret_variable: 'Variable "{path}" is secret and cannot be shown in this context.',
		invalid_path: 'Path "{path}" is not valid. It must have the form scope.path, with no spaces.',
		decrypt_failed: 'Secret variable "{path}" could not be decrypted.',
		read_failed: 'Global variables could not be read.',
	},
	warnings: {
		secret_variable: 'Variable "{path}" is secret: it will only be resolved on execution.',
	},
} satisfies LocaleMessageValue
