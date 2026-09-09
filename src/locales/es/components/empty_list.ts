import type { LocaleMessageValue } from 'vue-i18n'

export default {
	passkeys: {
		title: 'No se han encontrado claves de acceso',
		description: 'Parece que no has añadido ninguna clave de acceso. Crea una para empezar.',
		add: {
			label: 'Añadir clave de acceso',
			description: 'Añadir una nueva clave de acceso para desplegar en los servidores.',
		},
	},
	hosts: {
		title: 'No se han encontrado servidores',
		description: 'Parece que no has añadido ningún servidor. Crea uno para empezar.',
		add: {
			label: 'Añadir servidor',
			description: 'Añadir un nuevo servidor en el que se pueden desplegar proyectos.',
		},
	},
} satisfies LocaleMessageValue
