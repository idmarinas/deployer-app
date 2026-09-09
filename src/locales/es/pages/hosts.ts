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
	},
	manage: {
		title: {
			updates: 'Actualizaciones',
			metrics: 'Estado del servidor',
			server_info: 'Información del servidor',
		},
		metrics: {
			cpu_usage: 'Uso de CPU',
			ram_usage: 'Uso de RAM',
			disk_usage: 'Uso del disco',
		},
		actions_title: 'Acciones',
		test_connection: 'Probar conexión',
		check_status: 'Comprobar estado',
		check_updates: 'Comprobar actualizaciones',
		updates_summary: 'Total: {total} - Seguridad: {security} - Major: {major} - Minor: {minor} - Patch: {patch}',
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
				description: 'No se han podido actualizar los paquetes en: {name}. \nRazón: {reason}',
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
				description: 'No se ha podido eliminar el servidor: {name}. \nRazón: {reason}',
			},
		},
	},
} satisfies LocaleMessageValue
