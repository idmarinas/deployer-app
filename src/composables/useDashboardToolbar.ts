import { ref, inject, provide, type VNode, isVNode } from 'vue'

export type ToolbarContent = VNode[] | undefined
export type ToolbarManager = {
	moduleName: string
	toolbarKey: string
	setToolbarFn: (fn: () => ToolbarContent | VNode) => void
	clearContent: () => void
	updateToolbar: () => void
}

// Crear una key única por módulo
function createToolbarKey(moduleName: string = 'default'): string {
	return `dashboard:toolbar:${moduleName}`
}

/**
 * Composable usado en el layout padre (hosts.vue, projects.vue, etc)
 * para gestionar el toolbar de ese módulo específico
 *
 * @param moduleName - Nombre del módulo (hosts, projects, deployments, etc)
 */
export function useDashboardToolbarProvider(moduleName: string = 'default') {
	const toolbarContent = ref<ToolbarContent>(undefined)
	const toolbarKey = createToolbarKey(moduleName)
	let toolbarFn: () => ToolbarContent | VNode

	const setToolbarFn = (fn: () => ToolbarContent | VNode) => {
		toolbarFn = fn
		updateToolbar()
	}

	const updateToolbar = () => {
		const content = toolbarFn()
		toolbarContent.value = isVNode(content) ? [content] : content
	}

	const clearContent = () => {
		toolbarContent.value = undefined
	}

	const toolbarManager: ToolbarManager = {
		moduleName,
		toolbarKey,
		setToolbarFn,
		clearContent,
		updateToolbar,
	}

	provide(toolbarKey, toolbarManager)

	return {
		toolbarContent,
	}
}

/**
 * Composable usado en las páginas hijas (create.vue, edit.vue, [id].vue)
 * para inyectar contenido en el toolbar del módulo correspondiente
 *
 * @param moduleName - Nombre del módulo (debe coincidir con el usado en useDashboardToolbarProvider)
 */
export function useDashboardToolbar(moduleName: string = 'default') {
	const toolbarKey = createToolbarKey(moduleName)

	let toolbar = inject<ToolbarManager>(toolbarKey)

	if (!toolbar) {
		console.warn(
			`useDashboardToolbar("${moduleName}") no encontró el contexto. Asegúrate de que useDashboardToolbarProvider("${moduleName}") se está ejecutando en el componente padre.`,
		)
	}

	return toolbar
}
