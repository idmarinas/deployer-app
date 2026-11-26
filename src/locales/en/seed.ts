import type { LocaleMessageValue } from 'vue-i18n'

export default {
	sources: {
		commands: {
			label: 'Commands',
		},
	},
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
		update_packages: {
			name: 'Update packages',
			description: 'Upgrades specific Debian/Ubuntu packages with apt-get. Requires root permissions and an up-to-date index cache.',
			inputs: {
				packages: {
					label: 'Packages',
					help: 'Space-separated names (for example, openssl curl).',
				},
			},
		},
	},
} satisfies LocaleMessageValue
