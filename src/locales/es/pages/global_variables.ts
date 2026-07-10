import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Variables globales',
	table: {
		columns: {
			name: 'Nombre',
			slug: 'Slug',
			is_secret: 'Es secreta',
			value: 'Valor',
		},
		empty: {
			title: 'No se han encontrado variables',
			description: 'Parece que no has añadido ninguna variable. Crea una para empezar.',
		},
	},
	toast: {
		delete: {
			loading: {
				title: 'Eliminando variable',
				description: 'Se está eliminando la variable: "{name}"',
			},
			success: {
				title: 'Variable eliminada correctamente',
				description: 'Se ha eliminado la variable: "{name}"',
			},
			error: {
				title: 'Error al eliminar la variable',
				description: 'No se ha podido eliminar la variable: "{name}"',
			},
		},
	},
} satisfies LocaleMessageValue
