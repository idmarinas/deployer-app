import type { LocaleMessageValue } from 'vue-i18n'

export default {
	label: 'Tarea',
	name: 'Nombre',
	description: 'Descripción',
	type: 'Tipo',
	command: 'Comando',
	timeout: 'Timeout',
	retry_count: 'Reintentos',
	retry_delay: 'Espera entre reintentos',
	enabled: 'Habilitada',
	is_global: 'Global',
} satisfies LocaleMessageValue
