import type { CommandPaletteGroup, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { ModulesName } from '@/utils/deployer-app'
import { getModuleIcon, ICONS } from '@/utils/icons'

export function useSideberMenu() {
	const { t } = useI18n()

	const navigationMenu = computed<NavigationMenuItem[][]>(() => [
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
			// Servidores
			{
				label: t('components.sidebar.hosts'),
				icon: getModuleIcon(ModulesName.Hosts),
				to: { name: 'dashboard-hosts' },
				// description: 'Configurar conexiones a servidores'
			},
			// Claves de acceso
			{
				label: t('components.sidebar.passkeys'),
				icon: getModuleIcon(ModulesName.Passkeys),
				to: { name: 'dashboard-passkeys' },
				// description: 'Gestionar claves SSH (RSA, ED25519, ECDSA)'
			},
		],
		[
			// Comandos
			{
				label: t('components.sidebar.commands'),
				icon: getModuleIcon(ModulesName.Commands),
				to: { name: 'dashboard-commands' },
				// description: 'Comandos reutilizables para ejecutar en los servidores'
			},
			// Variables
			{
				label: t('components.sidebar.variables'),
				icon: getModuleIcon(ModulesName.Variables),
				to: { name: 'dashboard-variables' },
				// description: 'Variables reutilizables en todos los proyectos'
			},
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
	])

	const navigationMenuFooter = computed<NavigationMenuItem[]>(() => [
		// Consola remota
		{
			label: t('components.sidebar.console'),
			icon: ICONS.server.terminal,
			to: { name: 'dashboard-console' },
		},
		// Papelera
		{
			label: t('components.sidebar.trash'),
			icon: ICONS.actions.trash,
			to: { name: 'dashboard-trash' },
			ui: {
				link: 'text-error before:outline-error/25 hover:text-error',
				linkLeadingIcon: 'text-error group-hover:text-error',
			},
		},
	])

	const searchGroups = computed<CommandPaletteGroup[]>(() => [
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
					label: t('components.navigation.add.host.label'),
					suffix: t('components.navigation.add.host.description'),
					icon: getModuleIcon(ModulesName.Hosts, 'singular'),
					to: '/dashboard/hosts/add',
					kbds: ['shift', 'H'],
				},
				{
					label: t('components.navigation.add.passkey.label'),
					suffix: t('components.navigation.add.passkey.description'),
					icon: getModuleIcon(ModulesName.Passkeys),
					to: '/dashboard/passkeys/add',
					kbds: ['shift', 'K'],
				},
				{
					label: t('components.navigation.add.command.label'),
					suffix: t('components.navigation.add.command.description'),
					icon: getModuleIcon(ModulesName.Commands),
					to: '/dashboard/commands/add',
					kbds: ['shift', 'C'],
				},
				{
					label: t('components.navigation.add.variable.label'),
					suffix: t('components.navigation.add.variable.description'),
					icon: getModuleIcon(ModulesName.Variables),
					to: '/dashboard/variables/add',
					kbds: ['shift', 'V'],
				},
				// {
				// 	label: t('components.navigation.add.docker_compose.label'),
				// 	suffix: t('components.navigation.add.docker_compose.description'),
				// 	icon: getModuleIcon('docker_composes'),
				// 	to: '/dashboard/docker_composes/add',
				// 	kbds: ['shift', 'D'],
				// },
			],
		},
	])

	return {
		navigationMenu,
		navigationMenuFooter,
		searchGroups,
	}
}

export function useDashboardButton() {
	const { t } = useI18n()

	const items = computed<DropdownMenuItem[]>(() => [
		{
			label: t('components.navigation.add.host.label'),
			description: t('components.navigation.add.host.description'),
			icon: getModuleIcon(ModulesName.Hosts, 'singular'),
			to: { name: 'dashboard-hosts-add' },
			kbds: ['shift', 'H'],
		},
		{
			label: t('components.navigation.add.passkey.label'),
			description: t('components.navigation.add.passkey.description'),
			icon: getModuleIcon(ModulesName.Passkeys),
			to: { name: 'dashboard-passkeys-add' },
			kbds: ['shift', 'K'],
		},
		{
			type: 'separator',
		},
		{
			label: t('components.navigation.add.command.label'),
			description: t('components.navigation.add.command.description'),
			icon: getModuleIcon(ModulesName.Commands),
			to: { name: 'dashboard-commands-add' },
			kbds: ['shift', 'C'],
		},
		{
			label: t('components.navigation.add.variable.label'),
			description: t('components.navigation.add.variable.description'),
			icon: getModuleIcon(ModulesName.Variables),
			to: '/dashboard/variables/add',
			kbds: ['shift', 'V'],
		},
	])

	return items
}
