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
		libraries: [
			{
				title: 'Symfony Components',
				icon: 'i-tabler-brand-symfony',
				to: 'https://www.symfony.com/components',
				description: 'This project relies on these components for most of its features.',
			},
			{
				title: 'Other component',
				icon: 'i-tabler-components',
				to: 'https://www.example.com',
				description: 'Other Component used in this project.',
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
