import type { LocaleMessageValue } from 'vue-i18n'

export default {
	not_found: {
		default: {
			statusMessage: 'Not found',
			message: 'The item you were looking for could not be found.',
		},
		host: {
			statusMessage: 'Host not found',
			message: 'The host you were looking for could not be found.',
		},
		project: {
			statusMessage: 'Project not found',
			message: 'The project you were looking for could not be found.',
		},
		passkey: {
			statusMessage: 'Access key not found',
			message: 'The access key you were looking for could not be found.',
		},
		variable: {
			statusMessage: 'Variable not found',
			message: 'The variable you were looking for could not be found.',
		},
		task: {
			statusMessage: 'Task not found',
			message: 'The task you were looking for could not be found.',
		},
		deployment: {
			statusMessage: 'Deployment not found',
			message: 'The deployment you were looking for could not be found.',
		},
		docker_compose: {
			statusMessage: 'Docker compose not found',
			message: 'The docker compose you were looking for could not be found.',
		},
	},
	unknown: {
		statusMessage: 'Unknown error',
		message: 'An error occurred and the request could not be processed.',
	},
} satisfies LocaleMessageValue