import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir servidor',
		edit: 'Editar servidor',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará al servidor',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito del servidor',
	},
	host: {
		label: 'Host',
		help: 'Dirección IP o nombre de dominio del servidor',
	},
	port: {
		label: 'Puerto',
		help: 'Puerto de conexión SSH',
	},
	auth_type: {
		label: 'Tipo de autenticación',
		help: 'Tipo de autenticación para conexión remota al servidor',
		select: {
			password: 'Contraseña',
			key: 'Clave de acceso',
		},
	},
	username: {
		label: 'Usuario',
		help: 'Usuario SSH para conexión remota. Obligatorio independientemente del tipo de autenticación.',
	},
	password: {
		label: 'Contraseña',
		help: 'Contraseña SSH para conexión remota',
	},
	host_key_fingerprint: {
		label: 'Huella del servidor',
		help: 'Huella SHA256 de la clave del servidor. Se obtiene al comprobar la conexión y debe confirmarse.',
		check: 'Comprobar y confirmar',
		empty: 'Sin confirmar',
	},
	key: {
		label: 'Clave',
		help: 'Clave SSH para conexión remota',
	},
	enabled: {
		label: 'Habilitado',
		help: 'Indica si el servidor está habilitado para recibir despliegues',
	},
} satisfies LocaleMessageValue
