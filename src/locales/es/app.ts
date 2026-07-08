import type { LocaleMessageValue, MessageContext } from 'vue-i18n'

export default {
	title: 'DeployerApp',
	description: 'Una aplicación de despliegue de aplicaciones web fácil de usar',
	loading: {
		what: {
			default: 'recurso | recursos',
			project: 'proyecto | proyectos',
			host: 'servidor | servidores',
		},
		text: (ctx: MessageContext) => {
			return `Cargando ${ctx.linked(`app.loading.what.${ctx.named('what') || 'default'}`)}…`
		},
	},
	back_to_list: 'Volver a la lista',
} satisfies LocaleMessageValue
