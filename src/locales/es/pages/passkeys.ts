import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Claves de acceso',
	table: {
		columns: {
			name: 'Nombre',
			type: 'Tipo',
			fingerprint: 'Huella digital',
		},
	},
	toast: {
		delete: {
			loading: {
				title: 'Eliminando clave de acceso...',
				description: 'Eliminando clave de acceso {name}...',
			},
			success: {
				title: 'Clave de acceso eliminada',
				description: 'Clave de acceso {name} eliminada correctamente',
			},
			error: {
				title: 'Error al eliminar clave de acceso',
				description: 'Error al eliminar clave de acceso {name}',
			},
		},
	},
} satisfies LocaleMessageValue
