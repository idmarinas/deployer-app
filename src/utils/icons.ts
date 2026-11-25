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

import { ModulesName } from './deployer-app'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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

export const MODULE_ICONS: Record<ModulesName, ModuleIconSet> = {
	default: {
		plural: 'i-tabler-packages',
		singular: 'i-tabler-package',
		off: 'i-tabler-package-off',
	},
	hosts: {
		plural: 'i-tabler-cloud-network',
		singular: 'i-tabler-server',
		off: 'i-tabler-server-off',
	},
	// projects: {
	// 	plural: 'i-tabler-packages',
	// 	singular: 'i-tabler-package',
	// 	off: 'i-tabler-package-off',
	// },
	// deployments: {
	// 	plural: 'i-tabler-send',
	// 	singular: 'i-tabler-send',
	// 	off: 'i-tabler-send-off',
	// },
	variables: {
		plural: 'i-tabler-variable',
		singular: 'i-tabler-variable',
		off: 'i-tabler-variable-off',
	},
	passkeys: {
		plural: 'i-tabler-key',
		singular: 'i-tabler-key',
		off: 'i-tabler-key-off',
	},
	commands: {
		plural: 'i-tabler-terminal-2',
		singular: 'i-tabler-terminal',
		off: 'i-tabler-terminal',
	},
	// tasks: {
	// 	plural: 'i-tabler-list-check',
	// 	singular: 'i-tabler-list-details',
	// 	off: 'i-tabler-x',
	// },
	// docker_composes: {
	// 	plural: 'i-tabler-brand-docker',
	// 	singular: 'i-tabler-brand-docker',
	// 	off: 'i-tabler-brand-docker',
	// },
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
		stop: 'i-tabler-cancel',
		list: 'i-tabler-list',
		listDetails: 'i-tabler-list-details',
		folder: 'i-tabler-folder',
		folderOpen: 'i-tabler-folder-open',
		trash: 'i-tabler-trash',
		purge: 'i-tabler-trash-x',
		restore: 'i-tabler-restore',
		undo: 'i-tabler-arrow-back-up',
		moveUp: 'i-tabler-arrow-up',
		moveDown: 'i-tabler-arrow-down',
		arrowRight: 'i-tabler-arrow-right',
		arrowLeft: 'i-tabler-arrow-left',
		arrowNarrowRight: 'i-tabler-arrow-narrow-right',
		arrowNarrowDownDashed: 'i-tabler-arrow-narrow-down-dashed',
		arrowNarrowRightDashed: 'i-tabler-arrow-narrow-right-dashed',
		file: 'i-tabler-file',
		symlink: 'i-tabler-link',
	},

	/** Estados / feedback (toasts, alerts, badges) */
	status: {
		check: 'i-tabler-check',
		cross: 'i-tabler-x',
		circleCheck: 'i-tabler-circle-check',
		circleMinus: 'i-tabler-circle-minus',
		circleX: 'i-tabler-circle-x',
		infoCircle: 'i-tabler-info-circle',
		exclamationCircle: 'i-tabler-exclamation-circle',
		alertCircle: 'i-tabler-alert-circle',
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
		workingdir: 'i-tabler-folder',
		package: 'i-tabler-package',
	},

	/** Para las tabs de compose.yaml */
	compose: {
		include: 'i-tabler-file-import',
		volumes: 'i-tabler-database',
		services: 'i-tabler-package',
		networks: 'i-tabler-network',
		models: 'i-tabler-sparkles',
		secrets: 'i-tabler-shield-lock',
		configs: 'i-tabler-settings',
	},

	/** Iconos por kind para las pestañas de objetos anidados del formulario JSON-Schema */
	schemaForm: {
		object: 'i-tabler-box',
		map: 'i-tabler-map',
		array: 'i-tabler-list',
		union: 'i-tabler-toggle-left',
		any: 'i-tabler-code',
	},
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convierte un icono en formato UI (`i-tabler-*`) al formato Iconify (`tabler:*`) */
export function toIconify(icon: string): string {
	return icon.replace(/(?:^i-(?<set>tabler|cib)-)/m, '$<set>:')
}

/**
 * Devuelve el icono de un módulo según la variante solicitada.
 *
 * @param moduleName Nombre del módulo (hosts, projects, deployments, variables, passkeys, tasks)
 * @param variant 'plural' (listado/módulo, por defecto) | 'singular' (elemento activo) | 'off' (elemento inactivo)
 * @param isIconify Si es `true`, devuelve el icono en formato Iconify (`tabler:*`) en vez de UI (`i-tabler-*`)
 */
export function getModuleIcon(
	moduleName: ModulesName,
	variant: ModuleIconVariant = 'plural',
	isIconify = false,
): string {
	const set = MODULE_ICONS[moduleName] ?? MODULE_ICONS.default
	const icon = set[variant] ?? set.plural

	return isIconify ? toIconify(icon) : icon
}

/**
 * Devuelve el par { uncheckedIcon, checkedIcon } de un módulo, pensado para
 * USwitch / UToggle (uncheckedIcon = off, checkedIcon = singular).
 */
export function getModuleSwitchIcons(
	moduleName: ModulesName,
	isIconify = false,
): { uncheckedIcon: string; checkedIcon: string } {
	return {
		uncheckedIcon: getModuleIcon(moduleName, 'off', isIconify),
		checkedIcon: getModuleIcon(moduleName, 'singular', isIconify),
	}
}

// ---------------------------------------------------------------------------
// Iconos de archivos por extensión (gestor de archivos remoto)
//
// Portado de `_archived.dist/src/lib/files.ts` y adaptado a `FileEntry`, que no
// trae `mime_type` ni `is_binary`: la decisión se toma por nombre y extensión.
// Los iconos `i-vscode-icons-*` se pasan tal cual a `UIcon` (`toIconify()` solo
// convierte los sets `tabler`/`cib`).
// ---------------------------------------------------------------------------

const FILE_IMAGE_ICON = 'i-vscode-icons-file-type-image'
const FILE_BINARY_ICON = 'i-vscode-icons-file-type-binary'
const FILE_DEFAULT_ICON = 'i-vscode-icons-default-file'

const TEXT_EXTENSIONS = new Set([
	'txt',
	'md',
	'markdown',
	'conf',
	'config',
	'ini',
	'cfg',
	'properties',
	'toml',
	'env',
	'yml',
	'yaml',
	'json',
	'xml',
	'js',
	'mjs',
	'cjs',
	'ts',
	'tsx',
	'jsx',
	'sh',
	'bash',
	'zsh',
	'fish',
	'sql',
	'log',
	'csv',
	'htaccess',
	'gitignore',
	'dockerignore',
	'editorconfig',
	'html',
	'htm',
	'css',
	'scss',
	'sass',
	'svg',
	'php',
	'py',
	'rb',
	'go',
	'rs',
	'java',
	'c',
	'h',
	'cpp',
	'hpp',
	'vue',
	'svelte',
	'pem',
	'crt',
	'key',
	'pub',
	'asc',
	'gpg',
	'lock',
	'template',
	'tpl',
	'example',
	'sample',
	'service',
	'socket',
	'timer',
	'profile',
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif'])

export interface FileIconSource {
	name?: string | null
	icon?: string | null
	is_binary?: boolean
	mime_type?: string | null
}

function getExtension(fileName: string): string {
	return fileName.includes('.') ? (fileName.split('.').pop() ?? '').toLowerCase() : ''
}

/** Indica si el nombre corresponde a una imagen por extensión o MIME. */
export function isImageFileName(name: string, mimeType?: string | null): boolean {
	return !!mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.has(getExtension(name))
}

/** Icono por extensión de archivo de texto; por defecto, archivo genérico. */
export function iconForFileExtension(ext: string): string {
	switch (ext) {
		case 'env':
			return 'i-vscode-icons-file-type-dotenv'
		case 'json':
			return 'i-vscode-icons-file-type-json'
		case 'html':
		case 'htm':
			return 'i-vscode-icons-file-type-html'
		case 'css':
			return 'i-vscode-icons-file-type-css'
		case 'scss':
			return 'i-vscode-icons-file-type-scss'
		case 'js':
		case 'mjs':
		case 'cjs':
		case 'jsx':
			return 'i-vscode-icons-file-type-js'
		case 'ts':
		case 'tsx':
			return 'i-vscode-icons-file-type-typescript'
		case 'vue':
			return 'i-vscode-icons-file-type-vue'
		case 'php':
			return 'i-vscode-icons-file-type-php'
		case 'py':
			return 'i-vscode-icons-file-type-python'
		case 'go':
			return 'i-vscode-icons-file-type-go'
		case 'rs':
			return 'i-vscode-icons-file-type-rust'
		case 'sql':
			return 'i-vscode-icons-file-type-sql'
		case 'sh':
		case 'bash':
		case 'zsh':
		case 'fish':
			return 'i-vscode-icons-file-type-shell'
		case 'yml':
		case 'yaml':
			return 'i-vscode-icons-file-type-yaml'
		case 'toml':
			return 'i-vscode-icons-file-type-toml'
		case 'md':
		case 'markdown':
			return 'i-vscode-icons-file-type-markdown'
		case 'log':
			return 'i-vscode-icons-file-type-log'
		case 'svg':
			return 'i-vscode-icons-file-type-svg'
		case 'conf':
		case 'config':
		case 'ini':
			return 'i-vscode-icons-file-type-config'
		case 'txt':
			return 'i-vscode-icons-file-type-text'
		case 'sqlite':
			return 'i-vscode-icons-file-type-sqlite'
		case 'tar':
		case 'zip':
			return 'i-vscode-icons-file-type-zip'
		default:
			return FILE_DEFAULT_ICON
	}
}

function iconForFileName(name: string): string | undefined {
	switch (name) {
		case '.env.docker':
			return 'i-vscode-icons-file-type-dotenv'
		case 'composer.json':
			return 'i-vscode-icons-file-type-composer'
		case 'compose.yaml':
		case 'compose.yml':
		case 'compose.prod.yaml':
		case 'compose.prod.yml':
		case 'docker-compose.yaml':
		case 'docker-compose.yml':
			return 'i-vscode-icons-file-type-docker2'
		case '.editorconfig':
			return 'i-vscode-icons-file-type-editorconfig'
		case 'package.json':
			return 'i-vscode-icons-file-type-npm'
		case 'bun.lock':
			return 'i-vscode-icons-file-type-bun'
		case 'agents.md':
			return 'i-vscode-icons-file-type-agents'
		case '.gitignore':
		case '.gitkeep':
			return 'i-vscode-icons-file-type-git'
		default:
			return undefined
	}
}

/** Icono de un archivo, decidido por extensión y nombre cuando no hay MIME. */
export function getFileIcon(entry: FileIconSource): string {
	const name = entry.name ?? ''
	const ext = getExtension(name)

	if (entry.icon) return entry.icon

	// Los nombres especiales (.gitignore, docker-compose.yml, …) mandan antes
	// que la clasificación binaria por extensión.
	const namedIcon = iconForFileName(name)
	if (namedIcon) return namedIcon

	let isBinary: boolean
	if (entry.is_binary !== undefined) isBinary = entry.is_binary
	else if (entry.mime_type) isBinary = !entry.mime_type.startsWith('text/') && !TEXT_EXTENSIONS.has(ext)
	else isBinary = ext !== '' && !TEXT_EXTENSIONS.has(ext)

	if (isBinary) {
		if (isImageFileName(name, entry.mime_type)) return FILE_IMAGE_ICON

		return iconForFileExtension(ext) || FILE_BINARY_ICON
	}

	return iconForFileExtension(ext)
}

/** Icono de una entrada del árbol: carpeta, enlace o archivo por extensión. */
export function getEntryIcon(entry: { name: string; kind: string }, expanded = false): string {
	if (entry.kind === 'dir') return expanded ? ICONS.actions.folderOpen : ICONS.actions.folder
	if (entry.kind === 'symlink') return ICONS.actions.symlink
	return getFileIcon({ name: entry.name })
}
