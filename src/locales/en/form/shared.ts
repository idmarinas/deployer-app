import type { LocaleMessageValue } from 'vue-i18n'

export default {
	hint: {
		optional: 'Optional',
	},
	placeholder: {
		passkeys: {
			select: 'Select an access key',
		},
		hosts: {
			select: 'Select a host',
		},
		projects: {
			select: 'Select a project',
		},
		password: {
			input: 'Password',
		},
		temp_password: {
			input: 'Temporary password',
		},
		temp_username: {
			input: 'Temporary username',
		},
	},
	show: {
		password: 'Show password',
	},
	hide: {
		password: 'Hide password',
	},
	password: {
		strength: {
			label: 'The password must contain',
			score: {
				_0: 'Enter a password',
				_2: 'Weak password',
				_3: 'Medium password',
				_4: 'Strong password',
			},
			req: {
				meet: 'Requirement met',
				not_meet: 'Requirement not met',
				length: 'At least 8 characters',
				number: 'At least one number',
				lower: 'At least one lowercase letter',
				upper: 'At least one uppercase letter',
			},
		},
		generate: {
			label: 'Generate password',
			title_config: 'Generated password settings',
			config: 'Configure password generator',
			use_upper: 'Use uppercase letters',
			use_numbers: 'Use numbers',
			use_special: 'Use special characters',
		},
	},
	select: {
		framework: {
			symfony: {
				label: 'Symfony',
				description: 'PHP framework for web applications and a set of reusable PHP components.',
			},
			laravel: {
				label: 'Laravel',
				description: 'The PHP framework for web artisans.',
			},
			nextjs: {
				label: 'Next.js',
				description: 'The React framework for the web.',
			},
			vuejs: {
				label: 'Vue.js',
				description: 'The progressive JavaScript framework.',
			},
			generic: {
				label: 'Generic',
				description: 'For when no specific framework is used or when it is not in the list.',
			},
		},
	},
} satisfies LocaleMessageValue