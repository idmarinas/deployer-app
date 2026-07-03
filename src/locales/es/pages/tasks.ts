import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Tareas',
	table: {
		columns: {
			name: 'Nombre',
			task_type: 'Tipo',
			timeout: 'Timeout',
			enabled: 'Habilitada',
		},
		empty: {
			title: 'No se han encontrado tareas',
			description: 'Parece que no has añadido ninguna tarea global. Crea una para empezar.',
		},
	},
	toast: {
		delete: {
			loading: {
				title: 'Eliminando tarea',
				description: 'Se está eliminando la tarea: {name}',
			},
			success: {
				title: 'Tarea eliminada correctamente',
				description: 'Se ha eliminado la tarea: {name}',
			},
			error: {
				title: 'Error al eliminar la tarea',
				description: 'No se ha podido eliminar la tarea: {name}',
			},
		},
	},
	dependencies: {
		title: 'Dependencias',
		empty: 'Esta tarea no depende de ninguna otra.',
		add: {
			label: 'Añadir dependencia',
			task: {
				label: 'Depende de',
				placeholder: 'Selecciona una tarea',
			},
		},
		type: {
			label: 'Cuándo',
			select: {
				success: 'Si la anterior tuvo éxito',
				failure: 'Si la anterior falló',
				always: 'Siempre',
			},
		},
	},
} satisfies LocaleMessageValue
