import type { LocaleMessageValue } from 'vue-i18n'

export default {
	hint: {
		optional: 'Opcional',
	},
	placeholder: {
		passkeys: {
			select: 'Seleciona una clave de acceso',
		},
		hosts: {
			select: 'Seleciona un servidor',
		},
		projects: {
			select: 'Seleciona un proyecto',
		},
		password: {
			input: 'Contraseña',
		},
		temp_password: {
			input: 'Contraseña temporal',
		},
		temp_username: {
			input: 'Nombre de usuario temporal',
		},
	},
	show: {
		password: 'Mostrar contraseña',
	},
	hide: {
		password: 'Ocultar contraseña',
	},
	password: {
		strength: {
			label: 'La contraseña debe contener',
			score: {
				_0: 'Introduce una contraseña',
				_2: 'Contraseña débil',
				_3: 'Contraseña media',
				_4: 'Contraseña fuerte',
			},
			req: {
				meet: 'Cumple el requisito',
				not_meet: 'No cumple el requisito',
				length: 'Al menos 8 caracteres',
				number: 'Al menos un número',
				lower: 'Al menos una letra minúscula',
				upper: 'Al menos una letra mayúscula',
			},
		},
	},
	select: {
		framework: {
			symfony: {
				label: 'Symfony',
				description: 'Framework PHP para aplicaciones web y un conjunto de componentes PHP reutilizables.',
			},
			laravel: {
				label: 'Laravel',
				description: 'El framework PHP para artesanos de la web.',
			},
			nextjs: {
				label: 'Next.js',
				description: 'El framework de React para la web.',
			},
			vuejs: {
				label: 'Vue.js',
				description: 'El framework progresivo de JavaScript.',
			},
			generic: {
				label: 'Genérico',
				description: 'Para cuando no se usa un framework específico o cuando no está en la lista.',
			},
		},
	},
} satisfies LocaleMessageValue
