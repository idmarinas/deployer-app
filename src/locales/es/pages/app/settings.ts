import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Ajustes de la aplicación',
	notifications: {
		encryption_config: {
			saved: 'Configuración de cifrado guardada correctamente.',
			error: 'Error al guardar la configuración de cifrado.',
		},
	},
	sections: {
		encryption: {
			title: 'Cifrado de campos',
			description: 'Configura qué campos de cada tabla se cifran en la base de datos y si se exponen descifrados al frontend.',
			table: 'Nombre de la tabla',
			fields: 'Campos',
			encrypted: 'Cifrados',
			exposed: 'Expuestos',
			field: 'Campo',
			encrypt: 'Cifrar',
			expose: 'Exponer',
			exposeInfo: 'Si está activo, el valor se descifra antes de enviarse al frontend.',
			static: 'Fijo',
		},
	},
} satisfies LocaleMessageValue
