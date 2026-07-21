import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Docker Composes',
	table: {
		columns: {
			name: 'Nombre',
			host: 'Servidor',
			remote_path: 'Ruta remota',
			enabled: 'Habilitado',
			created_at: 'Creación',
		},
		empty: {
			title: 'No se han encontrado docker composes',
			description: 'Parece que no has añadido ningún docker compose. Crea uno para empezar.',
		},
	},
	content: {
		available: 'Disponible',
		empty: 'Sin contenido',
	},
	actions: {
		up: 'Subir y levantar',
		down: 'Detener',
		restart: 'Reiniciar',
		ps: 'Estado',
		logs: 'Logs',
		pull: 'Pull',
	},
	manage: {
		edit: 'Editar',
		actions_title: 'Acciones',
		services_title: 'Servicios',
		status_updated: 'Estado actualizado.',
		output_title: 'Output',
		compose_content_title: 'Contenido del compose',
	},
} satisfies LocaleMessageValue
