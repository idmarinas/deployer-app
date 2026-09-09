import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Pending migrations',
	headline: 'The database requires an update',
	description: 'Pending migrations that must be run for the application to work properly have been detected. Please click the button below to run the required migrations.',
	buttons: {
		run: 'Run migrations',
	},
	steps: {
		title: {
			run_migrations: 'Running migrations',
			validate: 'Validating database',
		},
		description: {
			idle: {
				run_migrations: 'Waiting to run migrations',
				validate: 'Waiting to validate the database',
			},
			loading: {
				run_migrations: 'Running migrations...',
				validate: 'Validating database...',
			},
			success: {
				run_migrations: 'Migrations executed successfully',
				validate: 'Database validated successfully',
			},
			error: {
				run_migrations: 'Error running migrations',
				validate: 'Error validating the database',
			},
		},
	},
	toast: {
		title: {
			success: 'Migrations executed successfully',
			error: 'Error running migrations',
		},
	},
} satisfies LocaleMessageValue