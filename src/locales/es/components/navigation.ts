import type { LocaleMessageValue } from 'vue-i18n'

export default {
	add: {
		project: {
			label: 'Añadir proyecto',
			description: 'Añadir un nuevo proyecto para gestionar despliegues.',
		},
		task: {
			label: 'Añadir tarea global',
			description: 'Añadir una nueva tarea global que se puede reutilizar.',
		},
		passkey: {
			label: 'Añadir clave de acceso',
			description: 'Añadir una nueva clave de acceso para desplegar en los servidores.',
		},
		host: {
			label: 'Añadir servidor',
			description: 'Añadir un nuevo servidor en el que se pueden desplegar proyectos.',
		},
		variable: {
			label: 'Añadir variable global',
			description: 'Añadir una nueva variable global que se puede reutilizar.',
		},
	},
	toolbar: {
		list: 'Lista',
		add: 'Añadir',
		edit: 'Editar',
	},
} satisfies LocaleMessageValue
