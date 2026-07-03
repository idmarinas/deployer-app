import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir tarea global',
		edit: 'Editar tarea global',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará a la tarea',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito de la tarea',
	},
	task_type: {
		label: 'Tipo de tarea',
		help: 'Determina cómo se ejecuta la tarea durante el despliegue',
		select: {
			command: 'Comando',
			script: 'Script',
			upload_file: 'Subir archivo',
			download_file: 'Descargar archivo',
		},
	},
	command: {
		label_command: 'Comando',
		help_command: 'Comando que se ejecutará en el servidor remoto',
		label_script: 'Contenido del script',
		help_script: 'Contenido del script que se ejecutará en el servidor remoto',
		file_transfer_notice: {
			title: 'Configuración por proyecto',
			description:
				'Las rutas de origen/destino de esta tarea se configuran al asignarla a cada proyecto, ya que dependen de la estructura de cada uno.',
		},
	},
	timeout: {
		label: 'Timeout (segundos)',
		help: 'Tiempo máximo de ejecución antes de considerar la tarea fallida',
	},
	retry_count: {
		label: 'Número de reintentos',
		help: 'Veces que se reintentará la tarea si falla',
	},
	retry_delay: {
		label: 'Espera entre reintentos (segundos)',
		help: 'Tiempo de espera entre cada reintento',
	},
	enabled: {
		label: 'Habilitada',
		help: 'Indica si la tarea está habilitada para poder asignarse a proyectos',
	},
} satisfies LocaleMessageValue
