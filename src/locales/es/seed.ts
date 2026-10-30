import type { LocaleMessageValue } from 'vue-i18n'

export default {
	commands: {
		system_metrics: {
			name: 'Métricas del sistema',
			description: 'CPU, RAM, disco y uptime del servidor.',
		},
		system_info: {
			name: 'Información del sistema',
			description: 'Kernel, arquitectura, memoria y gestor de paquetes del servidor.',
		},
		upgradable_packages: {
			name: 'Paquetes actualizables',
			description: 'Lista de paquetes con actualizaciones disponibles.',
		},
	},
} satisfies LocaleMessageValue
