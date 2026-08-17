import { isComposeFile } from '@/lib/files'

export function isMainComposeFile(filePath: string): boolean {
	const name = filePath.split('/').filter(Boolean).pop() ?? ''
	return isComposeFile(name) && !filePath.includes('/')
}

export function isSecondaryComposeFile(filePath: string): boolean {
	const name = filePath.split('/').filter(Boolean).pop() ?? ''
	return isComposeFile(name) && filePath.includes('/')
}
