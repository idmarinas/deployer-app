import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	title: 'DeployerApp',
	description: 'Manage and automate web application deployments on remote servers through tasks, SSH keys and configurable variables.',
	loading: {
		what: {
			default: 'resource | resources',
			project: 'project | projects',
			host: 'host | hosts',
			task: 'task | tasks',
			passkey: 'access key | access keys',
			global_variable: 'global variable | global variables',
			docker_compose: 'docker compose | docker composes',
		},
		text: (ctx: MessageContext) => {
			return `Loading ${ctx.linked(`app.loading.what.${ctx.named('what') || 'default'}`)}…`
		},
	},
	back_to_list: 'Back to list',
} satisfies LocaleMessageValue