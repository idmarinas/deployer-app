import type { TreeItem } from '@nuxt/ui'

const COMPOSE_ICON = 'i-vscode-icons-file-type-docker2'
const IMAGE_ICON = 'i-vscode-icons-file-type-image'
const BINARY_ICON = 'i-vscode-icons-file-type-binary'
const FILE_ICON = 'i-vscode-icons-file-type-text'

export const MAX_COMPOSE_FILE_SIZE = 256 * 1024

export const EXCLUDED_EXTENSIONS = new Set([
	'exe',
	'msi',
	'msix',
	'msp',
	'bat',
	'cmd',
	'com',
	'scr',
	'dll',
	'dylib',
	'so',
	'dmg',
	'pkg',
	'mpkg',
	'deb',
	'rpm',
	'appimage',
	'run',
])

export const IGNORED_DIRS = new Set(['vendor', 'node_modules', 'target'])

export interface FileTreeNode extends TreeItem {
	key: string
	type: 'file'
}

export interface FolderTreeNode extends TreeItem {
	key: string
	type: 'folder'
	slot: 'folder'
	children?: ComposeTreeNode[]
}

export type ComposeTreeNode = FileTreeNode | FolderTreeNode

export function isIgnoredComposeDir(filePath: string): boolean {
	const segments = filePath.split('/').filter(Boolean)
	return segments.some(segment => IGNORED_DIRS.has(segment.toLowerCase()))
}

export function isExcludedComposeFileType(filePath: string): boolean {
	const lower = filePath.toLowerCase()
	const dot = lower.lastIndexOf('.')
	if (dot < 0 || dot === lower.length - 1) return false
	return EXCLUDED_EXTENSIONS.has(lower.slice(dot + 1))
}

export function isComposeFile(filePath: string): boolean {
	const name = filePath.split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
	return (
		name === 'compose.yaml' || name === 'compose.yml' || name === 'docker-compose.yaml' || name === 'docker-compose.yml'
	)
}

export function isMainComposeFile(filePath: string): boolean {
	return isComposeFile(filePath) && !filePath.includes('/')
}

export function isSecondaryComposeFile(filePath: string): boolean {
	return isComposeFile(filePath) && filePath.includes('/')
}

export function isEnvFilePath(filePath: string): boolean {
	const lower = filePath.toLowerCase()
	return lower === '.env' || lower.endsWith('.env') || lower.startsWith('.env')
}

export function getUploadRelativePath(file: File): string {
	const relativePath = file.webkitRelativePath?.replace(/\\/g, '/')
	if (relativePath) {
		const segments = relativePath.split('/').filter(Boolean)
		if (segments.length > 1) return segments.slice(1).join('/')
		return segments[0] ?? file.name
	}
	return file.name
}

export interface FileMetadata {
	mimeType?: string
	size?: number
	lastModified?: number
	icon?: string
}

export function parseFileMetadata(metadata: string | null | undefined): FileMetadata {
	if (!metadata) return {}
	try {
		const parsed = JSON.parse(metadata)
		if (typeof parsed !== 'object' || parsed === null) return {}
		return parsed as FileMetadata
	} catch {
		return {}
	}
}

export function serializeFileMetadata(meta: FileMetadata): string {
	return JSON.stringify({
		mimeType: meta.mimeType ?? undefined,
		size: meta.size ?? undefined,
		lastModified: meta.lastModified ?? undefined,
		icon: meta.icon ?? undefined,
	})
}

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

function getExtension(fileName: string): string {
	return fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
}

const TEXT_LIKE_MIMES = new Set([
	'text/',
	'application/json',
	'application/xml',
	'application/x-yaml',
	'application/yaml',
	'application/javascript',
	'application/x-javascript',
	'application/x-sh',
	'application/x-shellscript',
	'application/x-httpd-php',
	'application/sql',
	'application/x-pem-file',
	'application/pgp-keys',
	'application/toml',
])

export function detectBinary(file: File): boolean {
	const mime = file.type.toLowerCase()
	if (mime && !mime.startsWith('text/')) {
		const isTextLike = [...TEXT_LIKE_MIMES].some(
			prefix => mime === prefix || (prefix.endsWith('/') && mime.startsWith(prefix)),
		)
		if (!isTextLike) return true
	}
	const ext = getExtension(file.name)
	return !TEXT_EXTENSIONS.has(ext)
}

function iconForExtension(ext: string): string {
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
		default:
			return 'i-vscode-icons-default-file'
	}
}

function iconForName(name: string): string | undefined {
	const icons: Record<string, string> = {
		'composer.json': 'i-vscode-icons-file-type-composer',
		'compose.yaml': 'i-vscode-icons-file-type-docker2',
		'compose.yml': 'i-vscode-icons-file-type-docker2',
		'docker-compose.yaml': 'i-vscode-icons-file-type-docker2',
		'docker-compose.yml': 'i-vscode-icons-file-type-docker2',
		'.editorconfig': 'i-vscode-icons-file-type-editorconfig',
		'package.json': 'i-vscode-icons-file-type-npm',
		'bun.lock': 'i-vscode-icons-file-type-bun',
		'agents.md': 'i-vscode-icons-file-type-agents',
		'.gitignore': 'i-vscode-icons-file-type-git',
		'.gitkeep': 'i-vscode-icons-file-type-git',
	}

	return icons[name] ?? undefined
}

export function pickFileIcon(file: File): string {
	const ext = getExtension(file.name)
	if (detectBinary(file)) {
		if (IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/')) return IMAGE_ICON
		return BINARY_ICON
	}

	const icon = iconForName(file.name)

	return icon ?? iconForExtension(ext)
}

export function getFileIcon(filePath: string, isBinary: boolean, metadata: FileMetadata): string {
	if (isComposeFile(filePath)) return COMPOSE_ICON
	if (metadata.icon) return metadata.icon
	const ext = getExtension(filePath)
	if (isBinary) {
		if (metadata.mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return IMAGE_ICON
		return BINARY_ICON
	}
	return iconForExtension(ext) ?? FILE_ICON
}
