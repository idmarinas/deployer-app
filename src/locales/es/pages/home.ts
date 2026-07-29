import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Cuadro de mandos',
	summary: {
		hosts: 'Servidores',
		passkeys: 'Claves de acceso',
		docker_composes: 'Docker Compose',
		enabled: 'habilitados',
	},
	recent: {
		hosts: 'Últimos servidores',
		passkeys: 'Últimas claves',
		docker_composes: 'Últimos Docker Compose',
		view_all: 'Ver todos',
		no_items: 'No hay elementos aún',
	},
	empty: {
		title: 'Bienvenido a DeployerApp',
		description: 'Comienza añadiendo tus primeros recursos para gestionar despliegues.',
	},
} satisfies LocaleMessageValue
