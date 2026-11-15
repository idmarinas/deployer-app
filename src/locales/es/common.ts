import type { LocaleMessageValue } from 'vue-i18n'

export default {
	status: {
		active: 'Activo',
		inactive: 'Inactivo',
		enabled: 'Habilitado',
		disabled: 'Deshabilitado',
		copied: 'Copiado',
	},

	deploy: {
		can: 'Se puede desplegar en este servidor',
		cannot: 'No se puede desplegar en este servidor',
	},

	actions: {
		view: 'Ver',
		edit: 'Editar',
		save: 'Guardar',
		create: 'Crear',
		list: 'Lista',
		delete: 'Eliminar',
		confirm: 'Confirmar',
		cancel: 'Cancelar',
		refresh: 'Actualizar',
		filter: 'Filtrar',
		enable: 'Activar',
		disable: 'Desactivar',
		copy: 'Copiar',
		test: 'Probar',
		undo: 'Deshacer',
		restore: 'Restaurar',
		purge: 'Eliminar definitivamente',
		purge_all: 'Vaciar papelera',
		purge_deleted: 'Eliminar borrados',
		unlink_delete: 'Desvincular y eliminar',
		delete_anyway: 'Eliminar de todos modos',
		continue: 'Continuar',
	},

	tabs: {
		active: 'Activos',
		trash: 'Borrados',
	},

	confirm: {
		delete: {
			label: 'Eliminar',
			description: '¿Estás seguro de que quieres eliminar "{name}"?',
		},
		purge: {
			label: 'Eliminar definitivamente',
			description: '"{name}" se eliminará de forma permanente. Esta acción no se puede deshacer.',
			referenced_suffix: 'También se desvinculará de las entidades que lo usan.',
		},
		purge_all: {
			label: 'Vaciar papelera',
			description:
				'Se eliminarán definitivamente todas las filas de la papelera de esta tabla. Esta acción no se puede deshacer.',
			confirm_title: 'Confirmar vaciado',
			confirm_description:
				'Última confirmación: las filas se borrarán de la base de datos y no se podrán recuperar.',
		},
		purge_deleted: {
			label: 'Eliminar borrados',
			description:
				'Se eliminarán definitivamente todos los elementos borrados de esta tabla. Esta acción no se puede deshacer.',
			confirm_title: 'Confirmar eliminación',
			confirm_description:
				'Última confirmación: los elementos borrados se eliminarán de la base de datos y no se podrán recuperar.',
		},
		referenced: {
			intro: '"{name}" está referenciado por:',
			suffix: 'Si continúas, se desvinculará de esas entidades.',
		},
		usages: {
			intro: '"{name}" se usa en los siguientes comandos:',
			suffix: 'Si continúas, esas expresiones dejarán de resolverse al ejecutar los comandos.',
		},
	},

	empty: {
		label: 'Vacío',
		description: 'No se ha proporcionado una descripción',
		passphrase: 'No está protegida con contraseña',
	},

	semver: {
		patch: 'Parche',
		minor: 'Menor',
		major: 'Mayor',
		security: 'Seguridad',
		unknown: 'Desconocido',
		packaging: 'Empaquetado',
		revision: 'Revisión de empaquetado: solo cambia el empaquetado, no el software',
	},

	common: {
		none: 'Ninguno',
		username: 'Usuario',
		encrypted: 'Encriptado',
		last_check: 'Última comprobación',
		yes: 'Sí',
		no: 'No',
		deprecated: 'Obsoleto',
		info: 'Información',
	},

	back: {
		list: 'Volver a la lista',
	},

	table: {
		columns: 'Columnas',
	},
} satisfies LocaleMessageValue
