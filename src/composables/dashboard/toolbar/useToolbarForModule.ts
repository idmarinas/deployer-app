import { useDashboardToolbar, useDashboardToolbarProvider } from '@/composables/dashboard/toolbar/useDashboardToolbar'

function createToolbarModule(NAME: string) {
	const { toolbarContent } = useDashboardToolbarProvider(NAME)
	const toolbar = useDashboardToolbar(NAME)

	return {
		toolbarContent,
		toolbar,
	}
}

export function useToolbarForHostsModule() {
	return createToolbarModule('hosts')
}

export function useToolbarForPasskeysModule() {
	return createToolbarModule('passkeys')
}

export function useToolbarForProjectsDockerCompose() {
	return createToolbarModule('projects-docker-compose')
}
