import type { LocaleMessageValue } from 'vue-i18n'

export default {
	generate: {
		title: 'Generar clave de acceso',
		description: 'Genera una nueva clave de acceso para el servidor',
	},
	copy_to_host: {
		title: 'Copiar clave de acceso a un servidor',
		description:
			'Copia la clave de acceso "{name}" a un servidor. La clave se copiará para el usuario configurado en el servidor.',
	},
	title: {
		add: 'Añadir clave de acceso',
		edit: 'Editar clave de acceso',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará a la clave de acceso',
	},
	key_type: {
		label: 'Tipo',
		help: 'Tipo de clave de acceso',
		select: {
			rsa: {
				label: 'RSA — Compatibilidad máxima',
				description: 'Compatible con servidores antiguos. Clave grande y operaciones lentas. Usa 4096 bits.',
			},
			ed25519: {
				label: 'Ed25519 — Recomendado',
				description: 'Moderno, rápido y muy seguro. Compatible con la mayoría de servidores actuales.',
			},
			ecdsa: {
				label: 'ECDSA — Uso limitado',
				description: 'Seguro pero sensible a fallos del generador aleatorio. Menos recomendado que Ed25519.',
			},
		},
	},
	key_content: {
		label: 'Contenido',
		help: 'Contenido de la clave de la clave privada',
	},
	passphrase: {
		label: 'Frase de contraseña',
		help: 'Frase de contraseña de la clave de acceso',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito de la clave de acceso',
	},
	fingerprint: {
		label: 'Huella digital',
		help: 'Huella digital de la clave privada',
	},
	server: {
		only_enabled: {
			label: 'Solo servidores habilitados',
		},
		label: 'Servidor',
		help: 'Servidor donde se instalará o eliminará la clave de acceso',
	},
} satisfies LocaleMessageValue
