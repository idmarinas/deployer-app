import type { LocaleMessageValue } from 'vue-i18n'

export default {
	errors: {
		key_format:
			'The key must start with a lowercase letter and may only contain lowercase letters, numbers and underscores.',
		key_duplicate: 'The key "{key}" is duplicated.',
		label_required: 'The label is required.',
		options_required: 'A "select" parameter must have at least one option.',
		option_value_required: 'An option value cannot be empty.',
		option_duplicate: 'The option value "{value}" is duplicated.',
		default_type: 'The default value does not match the parameter type.',
		default_scope: 'The default value may only reference global variables (the "global" root).',
		too_many: 'No more than {max} input parameters can be defined.',
		value_required: 'The parameter "{label}" is required.',
		value_invalid: 'The value of the parameter "{label}" is not valid for type "{type}".',
		default_unknown: 'The variable "{path}" does not exist or was deleted.',
		default_disabled: 'The variable "{path}" is disabled.',
		default_secret: 'The variable "{path}" is secret and cannot be used as a default value.',
	},
} satisfies LocaleMessageValue
