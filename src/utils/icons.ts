/**
 * Sistema centralizado de iconos de DeployerApp.
 *
 * Todos los iconos se definen en formato UI de Nuxt UI (`i-tabler-*`), que es el
 * formato esperado por la mayoría de props `icon` de los componentes (UButton,
 * UBadge, UIcon, etc). Cuando se necesite el formato Iconify (`tabler:*`) -por
 * ejemplo para el componente `<Icon />` de `@iconify/vue`- usa `toIconify()`.
 *
 * Estructura:
 * - `MODULE_ICONS`: un set { plural, singular, off } por cada módulo/entidad
 *   principal de la app (hosts, projects, deployments, variables, passkeys, tasks).
 *     - `plural`   -> icono de listado / navegación / módulo (ej. sidebar, UEmpty)
 *     - `singular` -> icono de un elemento individual / estado "activo"
 *     - `off`      -> icono del elemento cuando está deshabilitado / inactivo
 * - `ICONS`: el resto de iconos de la app, agrupados por categoría semántica.
 *
 * Uso típico:
 *   import { getModuleIcon, ICONS } from '@/utils/icons'
 *
 *   getModuleIcon('hosts')                 // 'i-tabler-cloud-network' (plural, por defecto)
 *   getModuleIcon('hosts', 'singular')      // 'i-tabler-server'
 *   getModuleIcon('hosts', 'off')           // 'i-tabler-server-off'
 *   getModuleIcon('hosts', 'singular', true) // 'tabler:server' (formato Iconify)
 *
 *   ICONS.actions.delete                   // 'i-tabler-trash'
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ModuleName = 'hosts' | 'projects' | 'deployments' | 'variables' | 'global_variables' | 'passkeys' | 'tasks' | 'docker_composes'

export type ModuleIconVariant = 'plural' | 'singular' | 'off'

export interface ModuleIconSet {
	/** Icono de listado / módulo / navegación (ej. sidebar, UEmpty, UDashboardNavbar) */
	plural: string
	/** Icono de un elemento individual cuando está activo/habilitado */
	singular: string
	/** Icono de un elemento individual cuando está inactivo/deshabilitado */
	off: string
}

// ---------------------------------------------------------------------------
// Iconos por módulo (plural / singular / off)
// ---------------------------------------------------------------------------

export const MODULE_ICONS: Record<ModuleName, ModuleIconSet> = {
	hosts: {
		plural: 'i-tabler-cloud-network',
		singular: 'i-tabler-server',
		off: 'i-tabler-server-off',
	},
	projects: {
		plural: 'i-tabler-packages',
		singular: 'i-tabler-package',
		off: 'i-tabler-package-off',
	},
	deployments: {
		plural: 'i-tabler-send',
		singular: 'i-tabler-send',
		off: 'i-tabler-send-off',
	},
	variables: {
		plural: 'i-tabler-variable',
		singular: 'i-tabler-variable',
		off: 'i-tabler-variable-off',
	},
	global_variables: {
		plural: 'i-tabler-variable',
		singular: 'i-tabler-variable',
		off: 'i-tabler-variable-off',
	},
	passkeys: {
		plural: 'i-tabler-key',
		singular: 'i-tabler-key',
		off: 'i-tabler-key-off',
	},
	tasks: {
		plural: 'i-tabler-list-check',
		singular: 'i-tabler-list-details',
		off: 'i-tabler-x',
	},
	docker_composes: {
		plural: 'i-tabler-brand-docker',
		singular: 'i-tabler-brand-docker',
		off: 'i-tabler-brand-docker',
	},
}

// ---------------------------------------------------------------------------
// Resto de iconos de la app, agrupados por categoría
// ---------------------------------------------------------------------------

export const ICONS = {
	/** Marca, navegación general de la app y ventana */
	app: {
		logo: 'i-tabler-rocket',
		dashboard: 'i-tabler-dashboard',
		settings: 'i-tabler-settings',
		window: 'i-tabler-window',
		language: 'i-tabler-language',
		appearance: 'i-tabler-sun-moon',
		notFound: 'i-tabler-file-x',
		selector: 'i-tabler-selector',
		chevronDown: 'i-tabler-chevron-down',
	},

	/** Acciones genéricas de CRUD / formularios / toolbars */
	actions: {
		add: 'i-tabler-plus',
		addCircle: 'i-tabler-circle-plus',
		edit: 'i-tabler-pencil',
		delete: 'i-tabler-trash',
		save: 'i-tabler-device-floppy',
		submit: 'i-tabler-send',
		reset: 'i-tabler-refresh',
		refresh: 'i-tabler-refresh',
		cancel: 'i-tabler-cancel',
		close: 'i-tabler-x',
		view: 'i-tabler-eye',
		viewOff: 'i-tabler-eye-off',
		copy: 'i-tabler-copy',
		play: 'i-tabler-play',
		list: 'i-tabler-list',
		listDetails: 'i-tabler-list-details',
		folder: 'i-tabler-folder',
	},

	/** Estados / feedback (toasts, alerts, badges) */
	status: {
		check: 'i-tabler-check',
		cross: 'i-tabler-x',
		circleCheck: 'i-tabler-circle-check',
		circleX: 'i-tabler-circle-x',
		infoCircle: 'i-tabler-info-circle',
		exclamationCircle: 'i-tabler-exclamation-circle',
		alertTriangle: 'i-tabler-alert-triangle',
		loading: 'i-tabler-loader-2',
	},

	/** Autenticación, credenciales y cifrado */
	auth: {
		user: 'i-tabler-user',
		passwordUser: 'i-tabler-password-user',
		key: 'i-tabler-key',
		keyOff: 'i-tabler-key-off',
		fingerprint: 'i-tabler-fingerprint',
		passwordFingerprint: 'i-tabler-password-fingerprint',
		lock: 'i-tabler-lock',
		lockOpen: 'i-tabler-lock-open',
	},

	/** Servidores, conexión SSH y entorno remoto */
	server: {
		server: 'i-tabler-server',
		serverOff: 'i-tabler-server-off',
		serverCog: 'i-tabler-server-cog',
		cloudNetwork: 'i-tabler-cloud-network',
		deviceDesktop: 'i-tabler-device-desktop',
		terminal: 'i-tabler-terminal-2',
		plug: 'i-tabler-plug',
		plugConnected: 'i-tabler-plug-connected',
	},

	/** Base de datos / pasos de configuración inicial y migraciones */
	database: {
		database: 'i-tabler-database',
		databaseSearch: 'i-tabler-database-search',
		databasePlus: 'i-tabler-database-plus',
		databaseCog: 'i-tabler-database-cog',
		databaseImport: 'i-tabler-database-import',
		databaseSmile: 'i-tabler-database-smile',
		fileDatabase: 'i-tabler-file-database',
	},

	/** Metadatos de fecha (creado / actualizado) */
	calendar: {
		createdAt: 'i-tabler-calendar-plus',
		updatedAt: 'i-tabler-calendar-time',
	},

	/** Frameworks de proyecto y control de versiones */
	framework: {
		symfony: 'i-tabler-brand-symfony',
		laravel: 'i-tabler-brand-laravel',
		nextjs: 'i-tabler-brand-nextjs',
		vuejs: 'i-tabler-brand-vue',
		generic: 'i-tabler-code',
		git: 'i-tabler-brand-git',
		unknown: 'i-tabler-question-mark',
	},

	/** Tipos de task (command, script, upload_file, download_file) */
	taskType: {
		command: 'i-tabler-terminal-2',
		script: 'i-tabler-script',
		upload_file: 'i-tabler-upload',
		download_file: 'i-tabler-download',
	},

	/** Redes sociales (footer del sidebar) */
	social: {
		x: 'i-tabler-brand-x',
		reddit: 'i-tabler-brand-reddit',
		paypal: 'i-tabler-brand-paypal',
		github: 'i-tabler-brand-github',
		linkedin: 'i-tabler-brand-linkedin',
    bitly: 'i-cib-bitly',
	},

	/** Misceláneos (galería de diseño, pestañas, etc.) */
	misc: {
		palette: 'i-tabler-palette',
		adjustments: 'i-tabler-adjustments',
		history: 'i-tabler-history',
		infoCircle: 'i-tabler-info-circle',
		lock: 'i-tabler-lock',
		lockOpen: 'i-tabler-lock-open',
		encrypt: 'i-tabler-key',
		empty: 'i-tabler-circle-dashed',
	},
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convierte un icono en formato UI (`i-tabler-*`) al formato Iconify (`tabler:*`) */
export function toIconify(icon: string): string {
	return icon.replace(/^i-tabler-/, 'tabler:')
}

/**
 * Devuelve el icono de un módulo según la variante solicitada.
 *
 * @param moduleName Nombre del módulo (hosts, projects, deployments, variables, passkeys, tasks)
 * @param variant 'plural' (listado/módulo, por defecto) | 'singular' (elemento activo) | 'off' (elemento inactivo)
 * @param isIconify Si es `true`, devuelve el icono en formato Iconify (`tabler:*`) en vez de UI (`i-tabler-*`)
 */
export function getModuleIcon(
	moduleName: ModuleName | string,
	variant: ModuleIconVariant = 'plural',
	isIconify = false,
): string {
	const set = MODULE_ICONS[moduleName as ModuleName] ?? MODULE_ICONS.projects
	const icon = set[variant] ?? set.plural

	return isIconify ? toIconify(icon) : icon
}

/**
 * Devuelve el par { uncheckedIcon, checkedIcon } de un módulo, pensado para
 * USwitch / UToggle (uncheckedIcon = off, checkedIcon = singular).
 */
export function getModuleSwitchIcons(
	moduleName: ModuleName | string,
	isIconify = false,
): { uncheckedIcon: string; checkedIcon: string } {
	return {
		uncheckedIcon: getModuleIcon(moduleName, 'off', isIconify),
		checkedIcon: getModuleIcon(moduleName, 'singular', isIconify),
	}
}
