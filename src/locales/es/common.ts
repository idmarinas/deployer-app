import type { LocaleMessageValue } from 'vue-i18n'

export default {
	status: {
		active: 'Activo',
		inactive: 'Inactivo',
		enabled: 'Habilitado',
		disabled: 'Deshabilitado',
	},

	deploy: {
		can: 'Se puede desplegar en este servidor',
		cannot: 'No se puede desplegar en este servidor',
	},

	actions: {
		view: 'Ver',
		edit: 'Editar',
		save: 'Guardar',
		delete: 'Eliminar',
		confirm: 'Confirmar',
		cancel: 'Cancelar',
		refresh: 'Actualizar',
		filter: 'Filtrar',
		enable: 'Activar',
		disable: 'Desactivar',
	},

	confirm: {
		delete: {
			label: 'Eliminar',
			description: '¿Estás seguro de que quieres eliminar "{name}"?',
		},
	},

	empty: {
		label: 'Vacío',
		description: 'No se ha proporcionado una descripción',
	},

	common: {
		none: 'Ninguno',
		username: 'Usuario',
		yes: 'Sí',
		no: 'No',
	},

	back: {
		list: 'Volver a la lista',
	},
} satisfies LocaleMessageValue
