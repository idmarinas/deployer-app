import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Gestor de archivos',
	tabs: {
		files: 'Archivos',
		transfers: 'Transferencias',
	},
	actions: {
		upload: 'Subir al servidor',
		download: 'Descargar al equipo',
		upload_hint: 'Selecciona archivos en el panel local y elige un servidor.',
		download_hint: 'Selecciona archivos en el panel remoto y elige una carpeta local.',
	},
} satisfies LocaleMessageValue
