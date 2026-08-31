import type { Ref } from 'vue'
import type { ToolbarContent, ToolbarManager } from './useDashboardToolbar'

import { inject } from 'vue'

import { createToolbarKey, useDashboardToolbarProvider } from './useDashboardToolbar'

type ToolbarModuleResult = {
	toolbarContent?: Ref<ToolbarContent>
	toolbar?: ToolbarManager
}

function createToolbarModule(NAME: string): ToolbarModuleResult {
	const existing = inject<ToolbarManager | null>(createToolbarKey(NAME), null)

	if (existing) {
		return { toolbar: existing }
	}

	const { toolbarContent } = useDashboardToolbarProvider(NAME)

	return { toolbarContent }
}

export function useToolbarForHostsModule(): ToolbarModuleResult {
	return createToolbarModule('hosts')
}

export function useToolbarForPasskeysModule(): ToolbarModuleResult {
	return createToolbarModule('passkeys')
}

export function useToolbarForProjectsDockerCompose(): ToolbarModuleResult {
	return createToolbarModule('projects.docker.compose')
}
