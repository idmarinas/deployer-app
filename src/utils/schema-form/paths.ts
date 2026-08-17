export type PathSegment = { key: string; index?: undefined } | { key?: undefined; index: number }

export function parsePath(path: string): PathSegment[] {
	const segments: PathSegment[] = []
	const re = /(?:^|\.)([^.[]+)|\[(\d+)\]/g
	let match: RegExpExecArray | null
	while ((match = re.exec(path)) !== null) {
		if (match[1] !== undefined) segments.push({ key: match[1] })
		else segments.push({ index: Number(match[2]) })
	}
	return segments
}

function pathPrefix(path: string): string {
	const segments = parsePath(path)
	if (segments.length === 0) return ''
	return segments.slice(0, -1).reduce<string>((acc, segment) => {
		if (segment.index !== undefined) return `${acc}[${segment.index}]`
		return acc ? `${acc}.${segment.key}` : (segment.key as string)
	}, '')
}

export function getAt(data: unknown, path: string): unknown {
	let current: any = data
	for (const segment of parsePath(path)) {
		if (current === undefined || current === null) return undefined
		current = segment.index !== undefined ? current[segment.index] : current[segment.key]
	}
	return current
}

export function setAt(data: unknown, path: string, value: unknown): void {
	const segments = parsePath(path)
	if (segments.length === 0) return
	const root = data as any
	let current: any = root
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i]
		const next = segments[i + 1]
		let child: any = segment.index !== undefined ? current[segment.index] : current[segment.key]
		if (child === undefined || child === null) {
			child = next.index !== undefined ? [] : {}
			if (segment.index !== undefined) current[segment.index] = child
			else current[segment.key] = child
		}
		current = child
	}
	const last = segments[segments.length - 1]
	if (last.index !== undefined) current[last.index] = value
	else current[last.key] = value
}

export function deleteAt(data: unknown, path: string): void {
	const segments = parsePath(path)
	if (segments.length === 0) return
	const last = segments[segments.length - 1]
	const parent: any = getAt(data, pathPrefix(path))
	if (parent === undefined || parent === null) return
	if (last.index !== undefined) {
		if (Array.isArray(parent)) parent.splice(last.index, 1)
	} else if (last.key !== undefined) {
		delete parent[last.key]
	}
}

function escapePointerToken(token: string): string {
	return token.replace(/~/g, '~0').replace(/\//g, '~1')
}

/** Convierte una ruta de formulario "a.b[0]" a puntero JSON "#/a/b/0". */
export function pathToPointer(path: string): string {
	if (!path) return '#'
	let pointer = '#'
	for (const segment of parsePath(path)) {
		if (segment.index !== undefined) pointer += `/${segment.index}`
		else pointer += `/${escapePointerToken(segment.key as string)}`
	}
	return pointer
}

/** Convierte un puntero JSON "#/a/b/0" a ruta de formulario "a.b[0]". */
export function pointerToPath(pointer: string): string {
	if (!pointer || pointer === '#') return ''
	const segments = pointer.split('/').slice(1)
	let path = ''
	for (const raw of segments) {
		const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
		if (/^\d+$/.test(key)) {
			path += `[${key}]`
		} else {
			path += path ? `.${key}` : key
		}
	}
	return path
}
