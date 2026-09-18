import type { LocaleMessageValue } from 'vue-i18n'

export default {
	host: {
		label: 'Servidor',
		placeholder: 'Selecciona un servidor',
		required: 'Selecciona un servidor para ejecutar operaciones remotas.',
	},
	command: {
		command_placeholder: 'Comando a ejecutar (ej. ls -la)',
		working_dir_placeholder: 'Directorio de trabajo',
		timeout_placeholder: 'Timeout (s)',
		run: 'Ejecutar',
	},
	upload: {
		local_placeholder: 'Ruta local (o selecciona)',
		remote_placeholder: 'Ruta remota de destino',
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
