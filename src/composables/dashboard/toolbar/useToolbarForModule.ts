import type { ToolbarContent, ToolbarManager } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import type { Ref } from 'vue'

import { inject } from 'vue'

import { createToolbarKey, useDashboardToolbarProvider } from '@/composables/dashboard/toolbar/useDashboardToolbar'
import { ModulesName } from '@/utils/deployer-app'

type ToolbarModuleResult = {
	toolbarContent?: Ref<ToolbarContent>
	toolbar?: ToolbarManager
}

function createToolbarModule(NAME: ModulesName): ToolbarModuleResult {
	const existing = inject<ToolbarManager | null>(createToolbarKey(NAME), null)

	if (existing) {
		return { toolbar: existing }
	}

	const { toolbarContent } = useDashboardToolbarProvider(NAME)

	return { toolbarContent }
}

export function useToolbarForHostsModule(): ToolbarModuleResult {
	return createToolbarModule(ModulesName.Hosts)
}

export function useToolbarForPasskeysModule(): ToolbarModuleResult {
	return createToolbarModule(ModulesName.Passkeys)
}

// export function useToolbarForProjectsDockerCompose(): ToolbarModuleResult {
// 	return createToolbarModule('projects.docker.compose')
// }
