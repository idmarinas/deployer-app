import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Servidores',
	table: {
		columns: {
			name: 'Nombre',
			ip: 'IP',
			port: 'Puerto',
			auth_type: 'Tipo de autenticación',
			enabled: 'Habilitado',
			created_at: 'Creación',
		},
		dropdown: {
			test_connection: 'Probar conexión',
			manage: 'Gestionar',
		},
		empty: {
			title: 'No se han encontrado servidores',
			description: 'Parece que no has añadido ningún servidor. Crea uno para empezar.',
		},
	},
	manage: {
		actions_title: 'Acciones',
		test_connection: 'Probar conexión',
		check_status: 'Comprobar estado',
		check_updates: 'Comprobar actualizaciones',
		server_info_title: 'Información del servidor',
		server_status_title: 'Estado del servidor',
		updates_title: 'Actualizaciones disponibles',
		updates_summary: 'Total: {total} | Seguridad: {security} | Major: {major} | Minor: {minor} | Patch: {patch}',
		update_selected: 'Actualizar seleccionados ({count})',
		update_all: 'Actualizar todo ({count})',
		update_package: 'Actualizar paquete',
		no_updates: 'El sistema está actualizado',
		edit: 'Editar',
		output_title: 'Salida',
		distribution: 'Distribución',
		kernel: 'Kernel',
		arch: 'Arquitectura',
		package_manager: 'Gestor de paquetes',
		uptime: 'Tiempo activo',
		cpu_cores: 'CPU',
		memory: 'Memoria (uso)',
		memory_total: 'Memoria total',
		disk: 'Disco (uso)',
		disk_total: 'Disco total',
		memory_usage: 'Memoria (uso)',
		disk_usage: 'Disco (uso)',
		column_package: 'Paquete',
		column_current: 'Actual',
		column_available: 'Nueva',
		column_type: 'Tipo',
		column_actions: '',
		select_all: 'Seleccionar todo',
		deselect_all: 'Deseleccionar todo',
		use_sudo: 'Usar sudo',
	},
	toast: {
		test_connection: {
			loading: {
				title: 'Probando conexión',
				description: 'Se está comprobando que se puede conectar al servidor: {name}',
			},
			success: {
				title: 'Conexión exitosa',
				description: 'Se ha establecido conexión con el servidor: {name}',
			},
			error: {
				title: 'Error al conectar',
				description: 'No se ha podido establecer conexión con el servidor: {name}',
			},
		},
		check_status: {
			loading: {
				title: 'Comprobando estado',
				description: 'Obteniendo información del servidor: {name}',
			},
			success: {
				title: 'Estado obtenido',
				description: 'Información del servidor: {name} actualizada',
			},
			error: {
				title: 'Error al comprobar estado',
				description: 'No se ha podido obtener el estado del servidor: {name}',
			},
		},
		check_updates: {
			loading: {
				title: 'Buscando actualizaciones',
				description: 'Comprobando actualizaciones disponibles en: {name}',
			},
			success: {
				title: 'Actualizaciones encontradas',
				description: '{count} actualización(es) disponible(s) en {name}',
			},
			error: {
				title: 'Error al buscar actualizaciones',
				description: 'No se han podido buscar actualizaciones en: {name}',
			},
			no_updates: {
				title: 'Sistema actualizado',
				description: 'No hay actualizaciones disponibles en: {name}',
			},
		},
		update_packages: {
			loading: {
				title: 'Actualizando paquetes',
				description: 'Se están actualizando los paquetes en: {name}',
			},
			success: {
				title: 'Paquetes actualizados',
				description: 'Los paquetes se han actualizado correctamente en: {name}',
			},
			error: {
				title: 'Error al actualizar',
				description: 'No se han podido actualizar los paquetes en: {name}',
			},
		},
		confirm_update: {
			single: {
				title: 'Confirmar actualización',
				description: '¿Actualizar el paquete {package} en {name}?',
			},
			selected: {
				title: 'Confirmar actualización',
				description: '¿Actualizar {count} paquete(s) seleccionado(s) en {name}?',
			},
			all: {
				title: 'Confirmar actualización',
				description: '¿Actualizar todos los {count} paquete(s) disponibles en {name}?',
			},
		},
		delete: {
			loading: {
				title: 'Eliminando servidor',
				description: 'Se está eliminando el servidor: {name}',
			},
			success: {
				title: 'Servidor eliminado correctamente',
				description: 'Se ha eliminado el servidor: {name}',
			},
			error: {
				title: 'Error al eliminar el servidor',
				description: 'No se ha podido eliminar el servidor: {name}',
			},
		},
	},
} satisfies LocaleMessageValue