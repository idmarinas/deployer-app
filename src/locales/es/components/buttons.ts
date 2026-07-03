import type { LocaleMessageValue } from 'vue-i18n'

export default {
	projects: {
		add: {
			label: 'Añadir proyecto',
			description: 'Añadir un nuevo proyecto para gestionar despliegues.',
		},
		delete: {
			label: 'Eliminar proyecto',
			description: 'Eliminar el proyecto seleccionado.',
		},
		info: {
			label: 'Información del proyecto',
			description: 'Ver la información del proyecto seleccionado.',
		},
	},
	tasks: {
		add: {
			label: 'Añadir tarea global',
			description: 'Añadir una nueva tarea global que se puede reutilizar.',
		},
	},
	passkeys: {
		add: {
			label: 'Añadir clave de acceso',
			description: 'Añadir una nueva clave de acceso para desplegar en los servidores.',
		},
	},
	hosts: {
		add: {
			label: 'Añadir servidor',
			description: 'Añadir un nuevo servidor en el que se pueden desplegar proyectos.',
		},
	},
	variables: {
		add: {
			label: 'Añadir variable global',
			description: 'Añadir una nueva variable global que se puede reutilizar.',
		},
	},
} satisfies LocaleMessageValue
