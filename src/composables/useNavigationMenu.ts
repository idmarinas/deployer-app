import type { CommandPaletteGroup, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'

import { getModuleIcon, ICONS } from '@/utils/icons'

export function useSideberMenu() {
	const { t } = useI18n()

	const navigationMenu: NavigationMenuItem[][] = [
		// [
		// 	// Proyectos
		// 	{
		// 		label: t('components.sidebar.projects'),
		// 		icon: getModuleIcon('projects'),
		// 		defaultOpen: true,
		// 		children: [
		// 			// Docker Composes
		// 			{
		// 				label: t('components.sidebar.docker_composes'),
		// 				icon: getModuleIcon('docker_composes'),
		// 				to: { name: 'dashboard-docker_composes' },
		// 			},
		// 		],
		// 	},
		// ],
		[
			// Claves de acceso
			{
				label: t('components.sidebar.passkeys'),
				icon: getModuleIcon('passkeys'),
				to: { name: 'dashboard-passkeys' },
				// description: 'Gestionar claves SSH (RSA, ED25519, ECDSA)'
			},
			// Servidores
			{
				label: t('components.sidebar.hosts'),
				icon: getModuleIcon('hosts'),
				to: { name: 'dashboard-hosts' },
				// description: 'Configurar conexiones a servidores'
			},
			// Variables
			// {
			//   label: t('components.sidebar.variables'),
			//   icon: getModuleIcon('variables'),
			//   to: {name: 'dashboard-global_variables'},
			//   // description: 'Variables reutilizables en todos los proyectos'
			// },
			// Tareas Globales
			// {
			//   label: t('components.sidebar.tasks'),
			//   icon: getModuleIcon('tasks'),
			//   to: {name: 'dashboard-tasks'},
			//   // description: 'Tareas reutilizables en múltiples proyectos'
			// },
			// Despliegues
			// {
			//   label: t('components.sidebar.deployments'),
			//   icon: getModuleIcon('deployments'),
			//   to: {name: 'dashboard-deployments'},
			// },
		],
	]

	const navigationMenuFooter: NavigationMenuItem[] = [
		// Consola remota
		{
			label: t('components.sidebar.console'),
			icon: ICONS.server.terminal,
			to: { name: 'dashboard-console' },
		},
	]

	const searchGroups: CommandPaletteGroup[] = [
		{
			id: 'actions',
			label: t('components.sidebar.search.actions'),
			items: [
				// {
				//   label: t('components.navigation.add.project.label'),
				//   suffix: t('components.navigation.add.project.description'),
				//   icon: getModuleIcon('projects', 'singular'),
				//   to: '/dashboard/projects/add',
				//   kbds: ['shift', 'P']
				// },
				// {
				//   label: t('components.navigation.add.task.label'),
				//   suffix: t('components.navigation.add.task.description'),
				//   icon: getModuleIcon('tasks'),
				//   to: '/dashboard/tasks/add',
				//   kbds: ['shift', 'T']
				// },
				{
					label: t('components.navigation.add.passkey.label'),
					suffix: t('components.navigation.add.passkey.description'),
					icon: getModuleIcon('passkeys'),
					to: '/dashboard/passkeys/add',
					kbds: ['shift', 'K'],
				},
				{
					label: t('components.navigation.add.host.label'),
					suffix: t('components.navigation.add.host.description'),
					icon: getModuleIcon('hosts', 'singular'),
					to: '/dashboard/hosts/add',
					kbds: ['shift', 'H'],
				},
				// {
				//   label: t('components.navigation.add.variable.label'),
				//   suffix: t('components.navigation.add.variable.description'),
				//   icon: getModuleIcon('variables'),
				//   to: '/dashboard/variables/add',
				//   kbds: ['shift', 'V']
				// },
				{
					label: t('components.navigation.add.docker_compose.label'),
					suffix: t('components.navigation.add.docker_compose.description'),
					icon: getModuleIcon('docker_composes'),
					to: '/dashboard/docker_composes/add',
					kbds: ['shift', 'D'],
				},
			],
		},
	]

	return {
		navigationMenu,
		navigationMenuFooter,
		searchGroups,
	}
}

export function useDashboardButton() {
	const { t } = useI18n()

	const items: DropdownMenuItem[] = [
		{
			label: t('components.sidebar.projects'),
			type: 'label',
		},
		{
			label: t('components.navigation.add.docker_compose.label'),
			description: t('components.navigation.add.docker_compose.description'),
			icon: getModuleIcon('docker_composes'),
			to: { name: 'dashboard-docker_composes-add' },
			kbds: ['shift', 'D'],
		},
		// {
		//   label: t('components.navigation.add.project.label'),
		//   description: t('components.navigation.add.project.description'),
		//   icon: getModuleIcon('projects', 'singular'),
		//   to: '/dashboard/projects/add',
		//   kbds: ['shift', 'P']
		// },
		// {
		//   label: t('components.navigation.add.task.label'),
		//   description: t('components.navigation.add.task.description'),
		//   icon: getModuleIcon('tasks'),
		//   to: '/dashboard/tasks/add',
		//   kbds: ['shift', 'T']
		// },
		{
			type: 'separator',
		},
		{
			label: t('components.navigation.add.passkey.label'),
			description: t('components.navigation.add.passkey.description'),
			icon: getModuleIcon('passkeys'),
			to: { name: 'dashboard-passkeys-add' },
			kbds: ['shift', 'K'],
		},
		{
			label: t('components.navigation.add.host.label'),
			description: t('components.navigation.add.host.description'),
			icon: getModuleIcon('hosts', 'singular'),
			to: { name: 'dashboard-hosts-add' },
			kbds: ['shift', 'H'],
		},
		// {
		//   label: t('components.navigation.add.variable.label'),
		//   description: t('components.navigation.add.variable.description'),
		//   icon: getModuleIcon('variables'),
		//   to: '/dashboard/variables/add',
		//   kbds: ['shift', 'V']
		// },
	]

	return items
}
