import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: 'Consola remota',
	host: {
		label: 'Servidor',
		placeholder: 'Selecciona un servidor',
		required: 'Selecciona un servidor para ejecutar operaciones remotas.',
	},
	sections: {
		command: 'Ejecutar comando',
		upload: 'Subir archivo',
		download: 'Descargar archivo',
	},
	command: {
		command_placeholder: 'comando a ejecutar (ej. ls -la)',
		working_dir_placeholder: 'directorio de trabajo (opcional)',
		timeout_placeholder: 'Timeout (s)',
		run: 'Ejecutar',
	},
	upload: {
		local_placeholder: 'ruta local (o selecciona)',
		remote_placeholder: 'ruta remota de destino',
		browse_file: 'Archivo',
		browse_dir: 'Carpeta',
		recursive: 'Directorio (recursivo)',
		chmod_placeholder: 'chmod (ej. 755, opcional)',
		submit: 'Subir',
	},
	download: {
		remote_placeholder: 'ruta remota a descargar',
		local_placeholder: 'guardar en (opcional, se obtiene el contenido si se deja vacío)',
		browse: 'Guardar en…',
		recursive: 'Directorio (recursivo)',
		submit: 'Descargar',
	},
	console: {
		title: 'Salida',
		placeholder: 'El output de las operaciones aparecerá aquí.',
		clear: 'Limpiar',
		cancel: 'Cancelar',
		exit_code: 'Código de salida: {code}',
		running: 'Ejecutando…',
		error: 'Error: {message}',
	},
	feedback: {
		executed: 'Comando ejecutado correctamente.',
		uploaded: 'Archivos subidos correctamente.',
		downloaded: 'Archivos descargados correctamente.',
		saved_to: 'Archivo guardado en {path}',
		failed: 'La operación falló. \nRazón: {reason}',
	},
} satisfies LocaleMessageValue
