import type { LocaleMessageValue } from 'vue-i18n'

export default {
	panel: {
		local: 'Equipo local',
		remote: 'Servidor remoto',
	},
	root: {
		select: 'Elegir carpeta',
		local_hint: 'Elige una carpeta local para comenzar.',
		remote_hint: 'Selecciona un servidor para explorar sus archivos.',
		reset: 'Restablecer ruta',
		reset_hint: 'Vuelve al directorio base de este servidor',
	},
	refresh: 'Actualizar',
	loading: 'Cargando…',
	empty: 'Esta carpeta está vacía.',
	entry: {
		open: 'Abrir carpeta',
		expand: 'Expandir un nivel',
		collapse: 'Contraer un nivel',
		select: 'Seleccionar',
		deselect: 'Deseleccionar',
		partial: 'Listado parcial',
		limit_reached: 'Se alcanzó el límite de carga; se han seleccionado los niveles alcanzados.',
	},
	errors: {
		load: 'No se pudo cargar el directorio.',
		read_local: 'No se pudo leer «{path}»: {reason}',
	},
	queue: {
		title: 'Transferencias',
		empty: 'No hay transferencias en la cola.',
		summary: '{completed} de {total} completados · {bytes} transferidos',
		cancel: 'Cancelar ítem',
		clear: 'Limpiar terminados',
		files: '{count} archivos',
		retry: 'Reintentar',
		retry_unavailable: 'El servidor ya no está disponible',
		no_files: 'Sin detalle de archivos',
		concurrency: 'Máximo {count} en curso',
		concurrency_label: 'Transferencias simultáneas',
	},
	status: {
		pending: 'Pendiente',
		running: 'En curso',
		success: 'Completado',
		error: 'Error',
		cancelled: 'Cancelado',
		skipped: 'Omitido',
		interrupted: 'Interrumpido',
	},
	direction: {
		upload: 'Subida',
		download: 'Descarga',
	},
	mark: {
		downloaded: 'Descargado',
	},
} satisfies LocaleMessageValue
