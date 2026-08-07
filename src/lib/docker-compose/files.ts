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

export function isExcludedComposeFileType(filePath: string): boolean {
	const lower = filePath.toLowerCase()
	const dot = lower.lastIndexOf('.')
	if (dot < 0 || dot === lower.length - 1) return false
	return EXCLUDED_EXTENSIONS.has(lower.slice(dot + 1))
}

export function isComposeFilePath(filePath: string): boolean {
	const lower = filePath.toLowerCase()
	return (
		lower === 'compose.yaml' ||
		lower === 'compose.yml' ||
		lower === 'docker-compose.yaml' ||
		lower === 'docker-compose.yml'
	)
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

const COMPOSE_ICON = 'i-vscode-icons-file-type-docker2'
const ENV_ICON = 'i-vscode-icons-file-type-dotenv'
const IMAGE_ICON = 'i-vscode-icons-file-type-image'
const BINARY_ICON = 'i-vscode-icons-file-type-binary'
const FILE_ICON = 'i-vscode-icons-file-type-text'

const EXTENSION_ICONS: Record<string, string> = {
	json: 'i-vscode-icons-file-type-json',
	html: 'i-vscode-icons-file-type-html',
	htm: 'i-vscode-icons-file-type-html',
	css: 'i-vscode-icons-file-type-css',
	scss: 'i-vscode-icons-file-type-scss',
	js: 'i-vscode-icons-file-type-js',
	mjs: 'i-vscode-icons-file-type-js',
	cjs: 'i-vscode-icons-file-type-js',
	jsx: 'i-vscode-icons-file-type-js',
	ts: 'i-vscode-icons-file-type-typescript',
	tsx: 'i-vscode-icons-file-type-typescript',
	vue: 'i-vscode-icons-file-type-vue',
	php: 'i-vscode-icons-file-type-php',
	py: 'i-vscode-icons-file-type-python',
	go: 'i-vscode-icons-file-type-go',
	rs: 'i-vscode-icons-file-type-rust',
	sql: 'i-vscode-icons-file-type-sql',
	sh: 'i-vscode-icons-file-type-shell',
	bash: 'i-vscode-icons-file-type-shell',
	zsh: 'i-vscode-icons-file-type-shell',
	fish: 'i-vscode-icons-file-type-shell',
	yml: 'i-vscode-icons-file-type-yaml',
	yaml: 'i-vscode-icons-file-type-yaml',
	toml: 'i-vscode-icons-file-type-toml',
	md: 'i-vscode-icons-file-type-markdown',
	markdown: 'i-vscode-icons-file-type-markdown',
	log: 'i-vscode-icons-file-type-log',
	svg: 'i-vscode-icons-file-type-svg',
	conf: 'i-vscode-icons-file-type-config',
	config: 'i-vscode-icons-file-type-config',
	ini: 'i-vscode-icons-file-type-config',
	txt: 'i-vscode-icons-file-type-text',
}

function iconForExtension(ext: string): string | undefined {
	return EXTENSION_ICONS[ext]
}

export function pickFileIcon(file: File): string {
	const relativePath = getUploadRelativePath(file)
	if (isComposeFilePath(relativePath)) return COMPOSE_ICON
	if (isEnvFilePath(relativePath)) return ENV_ICON
	const ext = getExtension(file.name)
	if (detectBinary(file)) {
		if (IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/')) return IMAGE_ICON
		return BINARY_ICON
	}
	return iconForExtension(ext) ?? FILE_ICON
}

export function getFileIcon(filePath: string, isBinary: boolean, metadata: FileMetadata): string {
	if (isComposeFilePath(filePath)) return COMPOSE_ICON
	if (metadata.icon) return metadata.icon
	if (isEnvFilePath(filePath)) return ENV_ICON
	const ext = getExtension(filePath)
	if (isBinary) {
		if (IMAGE_EXTENSIONS.has(ext) || metadata.mimeType?.startsWith('image/')) return IMAGE_ICON
		return BINARY_ICON
	}
	return iconForExtension(ext) ?? FILE_ICON
}
