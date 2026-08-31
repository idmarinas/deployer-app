import type { TreeItem } from '@nuxt/ui'

const IMAGE_ICON = 'i-vscode-icons-file-type-image'
const BINARY_ICON = 'i-vscode-icons-file-type-binary'

export interface ManagedFile {
	id?: number
	file_path: string
	content?: string | null
	is_binary: boolean
	name: string
	mime_type?: string | null
	size?: number | null
	last_modified?: number | null
	webkit_relative_path?: string | null
	icon?: string | null
}

export interface TreeFilesConfig {
	maxFileSize?: number
	excludedExtensions?: string[]
	ignoredDirs?: string[]
}

export const MAX_FILE_SIZE = 256 * 1024

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
	children?: ManagedTreeNode[]
}

export type ManagedTreeNode = FileTreeNode | FolderTreeNode

export interface FileEntryLike {
	name?: string
	icon?: string | null
	is_binary?: boolean
	mime_type?: string | null
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

const IMAGE_MIME_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	ico: 'image/x-icon',
	bmp: 'image/bmp',
	avif: 'image/avif',
}

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

export function isBinaryMimeType(mime: string): boolean {
	const m = mime.toLowerCase()
	if (!m) return false
	if (m.startsWith('text/')) return false
	return ![...TEXT_LIKE_MIMES].some(prefix => m === prefix || (prefix.endsWith('/') && m.startsWith(prefix)))
}

export function detectBinary(file: File): boolean {
	if (isBinaryMimeType(file.type)) return true
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
	switch (name) {
		case 'composer.json':
			return 'i-vscode-icons-file-type-composer'
		case 'compose.yaml':
		case 'compose.yml':
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

export function isImageEntry(entry: FileEntryLike): boolean {
	const ext = getExtension(entry.name ?? '')
	return !!entry.mime_type?.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)
}

export function getImageMimeType(entry: FileEntryLike): string | undefined {
	if (entry.mime_type?.startsWith('image/')) return entry.mime_type
	return IMAGE_MIME_TYPES[getExtension(entry.name ?? '')]
}

export function getFileIcon(entry: FileEntryLike): string {
	const name = entry.name ?? ''
	const ext = getExtension(name)

	if (entry.icon) return entry.icon

	let isBinary: boolean
	if (entry.is_binary !== undefined) isBinary = entry.is_binary
	else if (entry.mime_type) isBinary = isBinaryMimeType(entry.mime_type)
	else isBinary = ext !== '' && !TEXT_EXTENSIONS.has(ext)

	if (isBinary) {
		if (isImageEntry(entry)) return IMAGE_ICON
		return BINARY_ICON
	}

	return iconForName(name) ?? iconForExtension(ext)
}

export function isComposeFile(name: string): boolean {
	const lower = name.toLowerCase()
	return (
		lower === 'compose.yaml' ||
		lower === 'compose.yml' ||
		lower === 'docker-compose.yaml' ||
		lower === 'docker-compose.yml'
	)
}

export function isEnvFile(name: string): boolean {
	const lower = name.toLowerCase()
	return lower === '.env' || lower.endsWith('.env') || lower.startsWith('.env')
}

export function buildManagedFile(file: File): Omit<ManagedFile, 'id'> {
	const isBinary = detectBinary(file)
	const mimeType = file.type || undefined

	return {
		file_path: getUploadRelativePath(file),
		name: file.name,
		is_binary: isBinary,
		mime_type: mimeType,
		size: file.size,
		last_modified: file.lastModified,
		webkit_relative_path: file.webkitRelativePath || undefined,
		icon: getFileIcon({ name: file.name, mime_type: mimeType, is_binary: isBinary }),
	}
}

export function byteSize(content: string): number {
	return new TextEncoder().encode(content).byteLength
}

export function buildTree(files: ManagedFile[]): ManagedTreeNode[] {
	const root: ManagedTreeNode[] = []
	const nodeMap = new Map<string, FolderTreeNode>()

	function ensureFolder(folderPath: string): FolderTreeNode {
		const existing = nodeMap.get(folderPath)
		if (existing) return existing
		const parts = folderPath.split('/').filter(Boolean)
		const node: FolderTreeNode = {
			key: folderPath,
			label: parts[parts.length - 1] + '/',
			type: 'folder',
			slot: 'folder',
			children: [],
		}
		nodeMap.set(folderPath, node)
		if (parts.length === 1) {
			root.push(node)
		} else {
			const parent = ensureFolder(parts.slice(0, -1).join('/'))
			parent.children?.push(node)
		}
		return node
	}

	for (const f of files) {
		const parts = f.file_path.split('/').filter(Boolean)
		const node: FileTreeNode = {
			key: f.file_path,
			label: parts[parts.length - 1] ?? f.file_path,
			type: 'file',
			icon: getFileIcon(f),
		}
		if (parts.length <= 1) {
			root.push(node)
		} else {
			const folder = ensureFolder(parts.slice(0, -1).join('/'))
			folder.children?.push(node)
		}
	}

	function sortNodes(nodes: ManagedTreeNode[]) {
		nodes.sort((a, b) => {
			if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
			return (a.label ?? '').localeCompare(b.label ?? '')
		})
		for (const n of nodes) {
			if (n.type === 'folder' && n.children?.length) sortNodes(n.children)
		}
	}
	sortNodes(root)
	return root
}

export function collectFolderKeys(nodes: ManagedTreeNode[]): string[] {
	const keys: string[] = []
	function collect(items: ManagedTreeNode[]) {
		for (const n of items) {
			if (n.type === 'folder') {
				keys.push(n.key)
				if (n.children?.length) collect(n.children)
			}
		}
	}
	collect(nodes)
	return keys
}
