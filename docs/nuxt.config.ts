export default defineNuxtConfig({
	modules: ['@nuxtjs/i18n'],
	extends: ['github:idmarinas/nuxt-layers/docs-bundle#master', 'docus'],
	i18n: {
		locales: [
			{ code: 'en', name: 'English' },
			{ code: 'es', name: 'Español' },
			// { code: 'fr', name: 'Français' },
		],
		defaultLocale: 'es',
	},
	docsBundle: {
		name: 'DeployerApp',
		short_name: 'DeployerApp',
		libraries: [
			{
				icon: 'i-tabler-brand-nuxt',
				title: 'Nuxt UI',
				description:
					'La interfaz de la aplicación se construye con Nuxt UI v4: componentes accesibles y personalizables con tema basado en Tailwind CSS.',
				to: 'https://ui.nuxt.com',
			},
			{
				icon: 'i-tabler-brand-vue',
				title: 'VueJS',
				description:
					'El frontend se desarrolla con Vue 3 y TypeScript: composables, reactividad y tipado estricto sobre los que se apoyan todas las vistas.',
				to: 'https://vuejs.org',
			},
			{
				icon: 'i-simple-icons-drizzle',
				title: 'Drizzle ORM',
				description:
					'Capa de acceso a datos en modo proxy sobre SQLite: cifra, descifra y enmascara los campos sensibles con las claves del vault Stronghold.',
				to: 'https://orm.drizzle.team',
			},
			{
				icon: 'i-simple-icons-tauri',
				title: 'Tauri App',
				description:
					'Tauri 2 empaqueta la app en un binario nativo en Rust: backend de orquestación SSH/SFTP, gestión de la BD SQLite y vault Stronghold para credenciales.',
				to: 'https://tauri.app',
			},
			{
				icon: 'i-tabler-brand-tailwind',
				title: 'Tailwind CSS',
				description:
					'Tailwind CSS v4 define el sistema de estilos y el tema visual de la interfaz mediante utilidades configurables y adaptables a cualquier dispositivo.',
				to: 'https://tailwindcss.com',
			},
			{
				icon: 'i-simple-icons-pinia',
				title: 'Pinia Colada',
				description:
					'Pinia Colada gestiona el estado de datos del servidor: consultas con caching, deduplicación e invalidación automática hacia la BD local.',
				to: 'https://pinia-colada.esm.dev',
			},
		],
		socials: {
			x: 'https://x.com/idmarinas',
			reddit: 'https://reddit.com/u/idmarinas',
			paypal: 'https://www.paypal.me/idmarinas',
			bitly: 'https://bit.ly/m/idmarinas',
			githubsponsors: 'https://github.com/sponsors/idmarinas',
			linkedin: 'https://linkedin.com/in/idmarinas',
		},
		support_links: {
			title: 'Support me',
			links: [
				{
					icon: 'i-tabler-brand-paypal',
					label: 'PayPal.Me',
					to: 'https://www.paypal.me/idmarinas',
					target: '_blank',
				},
				{
					icon: 'i-tabler-brand-github',
					label: 'GitHub Sponsor',
					to: 'https://github.com/sponsors/idmarinas',
					target: '_blank',
				},
			],
		},
	},
	$production: {
		llms: {
			domain: 'https://idmarinas.github.io/deployer-app',
		},
	},
	vite: {
		optimizeDeps: {
			include: ['@vue/devtools-core', '@vue/devtools-kit'],
		},
	},
})
