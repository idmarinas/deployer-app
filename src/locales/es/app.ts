import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	title: 'DeployerApp',
	description: 'Gestiona y automatiza despliegues de aplicaciones web en servidores remotos mediante tareas, claves SSH y variables configurables.',
	loading: {
		what: {
			default: 'recurso | recursos',
			project: 'proyecto | proyectos',
			host: 'servidor | servidores',
			task: 'tarea | tareas',
			passkey: 'clave de acceso | claves de acceso',
			global_variable: 'variable global | variables globales',
			docker_compose: 'docker compose | docker composes',
		},
		text: (ctx: MessageContext) => {
			return `Cargando ${ctx.linked(`app.loading.what.${ctx.named('what') || 'default'}`)}…`
		},
	},
	back_to_list: 'Volver a la lista',
} satisfies LocaleMessageValue
