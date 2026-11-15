import type { LocaleMessageValue } from 'vue-i18n'

export default {
	columns: {
		deleted_at: 'Fecha de borrado',
	},
	empty: {
		title: 'Papelera vacía',
		list_title: 'Sin borrados',
		description: 'No hay elementos borrados en esta tabla.',
	},
} satisfies LocaleMessageValue
