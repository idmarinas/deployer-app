import type { LocaleMessageValue } from 'vue-i18n'

export default {
	commands: {
		system_metrics: {
			name: 'System metrics',
			description: 'CPU, RAM, disk and uptime of the host.',
		},
		system_info: {
			name: 'System information',
			description: 'Kernel, architecture, memory and package manager of the host.',
		},
		upgradable_packages: {
			name: 'Upgradable packages',
			description: 'List of packages with available updates.',
		},
	},
} satisfies LocaleMessageValue
