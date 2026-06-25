import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Migraciones pendientes',
	headline: 'La base de datos requiere actualización',
	description: 'Se han detectado migraciones pendientes que deben ejecutarse para que la aplicación funcione correctamente. Por favor, haz clic en el botón de abajo para ejecutar las migraciones necesarias.',
	buttons: {
		run: 'Ejecutar migraciones',
	},
	steps: {
		title: {
			run_migrations: 'Ejecutando migraciones',
			validate: 'Validando base de datos',
		},
		description: {
			idle: {
				run_migrations: 'Esperando para ejecutar migraciones',
				validate: 'Esperando para validar la base de datos',
			},
			loading: {
				run_migrations: 'Ejecutando migraciones...',
				validate: 'Validando base de datos...',
			},
			success: {
				run_migrations: 'Migraciones ejecutadas exitosamente',
				validate: 'Base de datos validada exitosamente',
			},
			error: {
				run_migrations: 'Error al ejecutar migraciones',
				validate: 'Error al validar la base de datos',
			},
		},
	},
	toast: {
		title: {
			success: 'Migraciones ejecutadas exitosamente',
			error: 'Error al ejecutar migraciones',
		},
	},
} satisfies LocaleMessageValue