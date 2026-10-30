import type { LocaleMessageValue } from 'vue-i18n'

export default {
	setup: {
		title: {
			save_path: 'Guardar ruta del archivo SQLite',
			create_file: 'Crear archivo SQLite',
			initialize: 'Conectar a la base de datos',
			migrations: 'Ejecutar migraciones',
			seed: 'Insertar datos iniciales',
			validate: 'Validar instalación',
		},
		description: {
			idle: {
				save_path: 'Esperando para guardar la ruta del archivo SQLite',
				create_file: 'Esperando para crear archivo SQLite',
				initialize: 'Esperando para conectar a la base de datos',
				migrations: 'Esperando para ejecutar migraciones',
				seed: 'Esperando para insertar datos iniciales',
				validate: 'Esperando para validar instalación',
			},
			loading: {
				save_path: 'Guardando ruta del archivo SQLite...',
				create_file: 'Creando archivo SQLite...',
				initialize: 'Conectando a la base de datos...',
				migrations: 'Ejecutando migraciones...',
				seed: 'Insertando datos iniciales...',
				validate: 'Validando instalación...',
			},
			success: {
				save_path: 'Ruta del archivo SQLite guardada exitosamente',
				create_file: 'Archivo SQLite creado exitosamente',
				initialize: 'Conexión a la base de datos exitosa',
				migrations: 'Migraciones ejecutadas exitosamente',
				seed: 'Datos iniciales insertados exitosamente',
				validate: 'Instalación validada exitosamente',
			},
			error: {
				save_path: 'Error al guardar la ruta del archivo SQLite',
				create_file: 'Error al crear archivo SQLite',
				initialize: 'Error al conectar a la base de datos',
				migrations: 'Error al ejecutar migraciones',
				seed: 'Error al insertar datos iniciales',
				validate: 'Error al validar instalación',
			},
		},
	},
} satisfies LocaleMessageValue
