import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Welcome to @:app.title !',
	headline: 'Initial setup',
	description: 'An easy-to-use, fully configurable web application deployment tool.\n @:app.title uses a SQLite file to store the configuration and state of the deployed applications. You can select an existing SQLite file or create a new one to get started.',
	buttons: {
		select: 'Select SQLite file',
		create: 'Create new SQLite file',
		restart: 'Restart setup',
	},
	steps: {
		title: {
			save_path: 'Save SQLite file path',
			create_file: 'Create SQLite file',
			initialize: 'Connect to the database',
			migrations: 'Run migrations',
			seed: 'Insert initial data',
			validate: 'Validate installation',
		},
		description: {
			idle: {
				save_path: 'Waiting to save the SQLite file path',
				create_file: 'Waiting to create SQLite file',
				initialize: 'Waiting to connect to the database',
				migrations: 'Waiting to run migrations',
				seed: 'Waiting to insert initial data',
				validate: 'Waiting to validate installation',
			},
			loading: {
				save_path: 'Saving the SQLite file path...',
				create_file: 'Creating SQLite file...',
				initialize: 'Connecting to the database...',
				migrations: 'Running migrations...',
				seed: 'Inserting initial data...',
				validate: 'Validating installation...',
			},
			success: {
				save_path: 'SQLite file path saved successfully',
				create_file: 'SQLite file created successfully',
				initialize: 'Database connection successful',
				migrations: 'Migrations executed successfully',
				seed: 'Initial data inserted successfully',
				validate: 'Installation validated successfully',
			},
			error: {
				save_path: 'Error saving the SQLite file path',
				create_file: 'Error creating SQLite file',
				initialize: 'Error connecting to the database',
				migrations: 'Error running migrations',
				seed: 'Error inserting initial data',
				validate: 'Error validating installation',
			},
		},
	},
	toast: {
		title: {
			success: 'Setup completed successfully',
			error: 'Error configuring the database',
			canceled: 'Setup canceled',
		},
		description: {
			success: 'The database has been configured correctly',
			error: 'An error occurred while configuring the database',
			canceled: 'Database setup canceled',
		},
		error: {
			save_path: 'Error saving the SQLite file path',
			create_file: 'Error creating SQLite file',
			initialize: 'Error connecting to the database',
			migrations: 'Error running migrations',
			seed: 'Error inserting initial data',
			validate: 'Error validating installation',
		},
	},
} satisfies LocaleMessageValue