import type { CommandPaletteGroup, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'

export function useSideberMenu() {
  const { t } = useI18n()

  const navigationMenu: NavigationMenuItem[] = [
    // Dashboard
    {
      label: t('components.sidebar.home'),
      icon: 'i-tabler-home',
      to: '/dashboard',
      exact: true
    },
    // Proyectos
    {
      label: t('components.sidebar.projects'),
      icon: 'i-tabler-packages',
      to: '/dashboard/projects',
    },
    // Claves de acceso
    {
      label: t('components.sidebar.passkeys'),
      icon: 'i-tabler-key',
      to: '/dashboard/passkeys',
      // description: 'Gestionar claves SSH (RSA, ED25519, ECDSA)'
    },
    // Servidores
    {
      label: t('components.sidebar.hosts'),
      icon: 'i-tabler-cloud-network',
      to: '/dashboard/hosts',
      // description: 'Configurar conexiones a servidores'
    },
    // Variables
    {
      label: t('components.sidebar.variables'),
      icon: 'i-tabler-variable',
      to: '/dashboard/variables',
      // description: 'Variables reutilizables en todos los proyectos'
    },
    // Tareas Globales
    {
      label: t('components.sidebar.tasks'),
      icon: 'i-tabler-list-check',
      to: '/dashboard/tasks',
      // description: 'Tareas reutilizables en múltiples proyectos'
    },
    // Despliegues
    {
      label: t('components.sidebar.deployments'),
      icon: 'i-tabler-send',
      to: '/dashboard/deployments',
    },
  ]

  const searchGroups: CommandPaletteGroup[] = [
    {
      id: 'actions',
      label: t('components.sidebar.search.actions'),
      items: [
        {
          label: t('components.navigation.add.project.label'),
          suffix: t('components.navigation.add.project.description'),
          icon: 'i-tabler-package',
          to: '/dashboard/projects/add',
          kbds: ['shift', 'P']
        },
        {
          label: t('components.navigation.add.task.label'),
          suffix: t('components.navigation.add.task.description'),
          icon: 'i-tabler-list-check',
          to: '/dashboard/tasks/add',
          kbds: ['shift', 'T']
        },
        {
          label: t('components.navigation.add.passkey.label'),
          suffix: t('components.navigation.add.passkey.description'),
          icon: 'i-tabler-key',
          to: '/dashboard/passkeys/add',
          kbds: ['shift', 'K']
        },
        {
          label: t('components.navigation.add.host.label'),
          suffix: t('components.navigation.add.host.description'),
          icon: 'i-tabler-server',
          to: '/dashboard/hosts/add',
          kbds: ['shift', 'H']
        },
        {
          label: t('components.navigation.add.variable.label'),
          suffix: t('components.navigation.add.variable.description'),
          icon: 'i-tabler-variable',
          to: '/dashboard/variables/add',
          kbds: ['shift', 'V']
        },
      ]
    }
  ]

  return {
    navigationMenu,
    searchGroups,
  }
}


export function useDashboardButton() {
  const { t } = useI18n()

  const items: DropdownMenuItem[] = [
    {
      label: t('components.navigation.add.project.label'),
      description: t('components.navigation.add.project.description'),
      icon: 'i-tabler-package',
      to: '/dashboard/projects/add',
      kbds: ['shift', 'P']
    },
    {
      label: t('components.navigation.add.task.label'),
      description: t('components.navigation.add.task.description'),
      icon: 'i-tabler-list-check',
      to: '/dashboard/tasks/add',
      kbds: ['shift', 'T']
    },
    {
      label: t('components.navigation.add.passkey.label'),
      description: t('components.navigation.add.passkey.description'),
      icon: 'i-tabler-key',
      to: '/dashboard/passkeys/add',
      kbds: ['shift', 'K']
    },
    {
      label: t('components.navigation.add.host.label'),
      description: t('components.navigation.add.host.description'),
      icon: 'i-tabler-server',
      to: '/dashboard/hosts/add',
      kbds: ['shift', 'H']
    },
    {
      label: t('components.navigation.add.variable.label'),
      description: t('components.navigation.add.variable.description'),
      icon: 'i-tabler-variable',
      to: '/dashboard/variables/add',
      kbds: ['shift', 'V']
    }
  ]

  return items
}
