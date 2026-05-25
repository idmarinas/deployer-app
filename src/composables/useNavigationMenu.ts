import type { CommandPaletteGroup, NavigationMenuItem } from '@nuxt/ui'

import { useI18n } from 'vue-i18n'

export function useSideberMenu() {
  const { t } = useI18n()

  const navigationMenu: NavigationMenuItem[] = [
    // Dashboard
    {
      label: t('components.sidebar.home'),
      icon: 'i-tabler-home',
      to: '/',
    },
    // Proyectos
    {
      label: t('components.sidebar.projects'),
      icon: 'i-tabler-packages',
      to: '/projects',
    },
    // Claves de acceso
    {
      label: t('components.sidebar.passkeys'),
      icon: 'i-tabler-key',
      to: '/passkeys',
      // description: 'Gestionar claves SSH (RSA, ED25519, ECDSA)'
    },
    // Servidores
    {
      label: t('components.sidebar.hosts'),
      icon: 'i-tabler-cloud-network',
      to: '/hosts',
      // description: 'Configurar conexiones a servidores'
    },
    // Variables
    {
      label: t('components.sidebar.variables'),
      icon: 'i-tabler-variable',
      to: '/variables',
      // description: 'Variables reutilizables en todos los proyectos'
    },
    // Tareas Globales
    {
      label: t('components.sidebar.tasks'),
      icon: 'i-tabler-list-check',
      to: '/tasks',
      // description: 'Tareas reutilizables en múltiples proyectos'
    },
    // Despliegues
    {
      label: t('components.sidebar.deployments'),
      icon: 'i-tabler-send',
      to: '/deployments',
    },
  ]

  const searchGroups: CommandPaletteGroup[] = [
  ]

  return {
    navigationMenu,
    searchGroups,
  }
}
