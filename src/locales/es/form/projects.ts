import type { LocaleMessageValue } from 'vue-i18n'

export default {
	title: {
		add: 'Añadir proyecto',
		edit: 'Editar proyecto',
	},
	name: {
		label: 'Nombre',
		help: 'Nombre único que identificará al proyecto',
	},
	description: {
		label: 'Descripción',
		help: 'Descripción opcional para recordar el propósito del proyecto',
	},
	git_url: {
		label: 'URL del repositorio',
		description: 'URL del repositorio del proyecto',
		help: 'La URL del repositorio del proyecto se utiliza para desplegar el proyecto en el servidor.',
	},
	framework: {
		label: 'Framework',
		help: 'Framework del proyecto',
		select: {
			symfony: {
				label: 'Symfony',
				description: 'Framework Symfony',
			},
			laravel: {
				label: 'Laravel',
				description: 'Framework Laravel',
			},
			nextjs: {
				label: 'Next.js',
				description: 'Framework Next.js',
			},
			generic: {
				label: 'Genérico',
				description: 'Framework genérico',
			},
		},
	},
	local_working_dir: {
		label: 'Directorio de trabajo local',
		help: 'Directorio local donde se copiará el proyecto',
	},
	remote_working_dir: {
		label: 'Directorio de trabajo remoto',
		help: 'Directorio remoto donde se desplegará el proyecto',
	},
	enabled: {
		label: 'Habilitado',
		help: 'Indica si el proyecto está habilitado para crear despliegues',
	},
} satisfies LocaleMessageValue
