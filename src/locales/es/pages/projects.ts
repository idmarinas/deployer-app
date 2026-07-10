import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Proyectos',
	table: {
		columns: {
			name: 'Nombre',
			git_url: 'Url del repositorio',
		},
		empty: {
			title: 'No se han encontrado proyectos',
			description: 'Parece que no has añadido ningún proyecto. Crea uno para empezar.',
		},
	},
	hosts: {
		title: 'Servidores asignados',
		add: {
			label: 'Añadir servidor',
			host: {
				label: 'Servidor',
				placeholder: 'Selecciona un servidor',
			},
			deploy_order: {
				label: 'Orden',
			},
		},
		empty: {
			title: 'Sin servidores asignados',
			description: 'Añade servidores donde desplegar este proyecto.',
		},
	},
	tasks: {
		title: 'Tareas del proyecto',
		add: {
			label: 'Añadir tarea',
			task: {
				label: 'Tarea',
				placeholder: 'Selecciona una tarea del catálogo',
			},
		},
		settings: {
			on_failure: {
				label: 'Si falla',
				select: {
					stop: 'Detener despliegue',
					continue: 'Continuar con la siguiente tarea',
					retry: 'Reintentar',
				},
			},
			condition: {
				label: 'Condición de ejecución',
			},
			local_working_dir: {
				label: 'Directorio local (sobrescribe el del proyecto)',
			},
			remote_working_dir: {
				label: 'Directorio remoto (sobrescribe el del proyecto)',
			},
			retry_count: {
				label: 'Reintentos (sobrescribe la tarea)',
			},
			retry_delay: {
				label: 'Espera entre reintentos (sobrescribe la tarea)',
			},
			file_transfer: {
				title: 'Transferencia de archivos',
			},
			overwrite: {
				label: 'Sobrescribir si ya existe',
			},
			paths: {
				item_title: 'Ruta {n}',
				add: {
					label: 'Añadir ruta',
				},
				src: {
					label: 'Origen',
				},
				dest: {
					label: 'Destino',
				},
				recursive: {
					label: 'Directorio completo (recursivo)',
				},
				exclude: {
					label: 'Excluir (patrones separados por coma, solo si es directorio)',
				},
				chmod: {
					label: 'Permisos tras subir (chmod, ej. 755)',
				},
			},
		},
		empty: {
			title: 'Sin tareas asignadas',
			description: 'Añade tareas del catálogo para definir los pasos del despliegue.',
		},
	},
	variables: {
		title: 'Variables del proyecto',
		add: {
			label: 'Añadir variable',
		},
		field: {
			name: {
				label: 'Nombre',
			},
			slug: {
				label: 'Slug',
			},
			value: {
				label: 'Valor',
			},
			description: {
				label: 'Descripción',
			},
			is_secret: {
				label: 'Secreta',
			},
		},
		empty: {
			title: 'Sin variables',
			description: () => 'Añade variables que podrás usar en tus tareas con {{variable}}.',
		},
	},
} satisfies LocaleMessageValue
