/**
 * generate-i18n-schema.ts
 *
 * Genera typed-locale.d.ts (en la raíz del proyecto) a partir de los archivos
 * en src/locales/es/**. Replica la misma lógica de normalizeKey/setDeep que
 * usa src/locales/_loader.ts en runtime, pero a nivel de tipos (import type + typeof).
 *
 * Se ejecuta automáticamente antes de "dev" y "build" (ver package.json),
 * o manualmente con: bun run i18n:types
 *
 * NO EDITAR typed-locale.d.ts a mano: se sobreescribe en cada ejecución.
 */

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const LOCALES_DIR = join(__dirname, '../src/locales')
const ES_DIR = join(LOCALES_DIR, 'es')
const OUTPUT = join(join(__dirname, '../'), 'typed-locale.d.ts')

// Carpetas excluidas del schema (formatos de fecha/número, no son mensajes)
const EXCLUDED_DIRS = new Set(['formats'])

// ---------------------------------------------------------------------------
// 1. Recorrer src/locales/es/ y obtener rutas relativas sin extensión
//    ej: 'pages/app/settings.ts' -> 'pages/app/settings'
// ---------------------------------------------------------------------------
function walk(dir: string): string[] {
	return readdirSync(dir).flatMap(name => {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			if (EXCLUDED_DIRS.has(name)) return []
			return walk(full)
		}

		if (!name.endsWith('.ts')) return []

		return [relative(ES_DIR, full).replace(/\\/g, '/').replace(/\.ts$/, '')]
	})
}

const paths = walk(ES_DIR).sort()

if (paths.length === 0) {
	console.warn('[i18n] ⚠️  No se encontraron archivos en src/locales/es/. schema.ts no se generó.')
	process.exit(0)
}

// ---------------------------------------------------------------------------
// 2. Generar un alias de import único por archivo
//    'pages/app/settings' -> 'pagesAppSettings'
//    'entity/common'      -> 'entityCommon'
// ---------------------------------------------------------------------------
function toAlias(path: string): string {
	return path
		.split('/')
		.map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('')
}

const aliasByPath = new Map(paths.map(p => [p, toAlias(p)]))

// Comprobación de colisiones de alias (improbable, pero por seguridad)
const seen = new Set<string>()
for (const alias of aliasByPath.values()) {
	if (seen.has(alias)) {
		console.error(`[i18n] ❌ Alias de import duplicado: "${alias}". Revisa los nombres de archivo en src/locales/es/.`)
		process.exit(1)
	}
	seen.add(alias)
}

const imports = paths.map(p => `import type ${aliasByPath.get(p)} from './src/locales/es/${p}'`).join('\n')

// ---------------------------------------------------------------------------
// 3. Montar el árbol anidado de tipos, replicando setDeep() de _loader.ts
// ---------------------------------------------------------------------------
type TypeTree = {
	__index?: string
	[key: string]: TypeTree | string | undefined
}

function setDeep(obj: TypeTree, parts: string[], typeRef: string, isIndex = false): void {
	const [key, ...rest] = parts
	if (rest.length === 0) {
		if (isIndex) {
			if (typeof obj[key] !== 'object') {
				obj[key] = { __index: typeRef }
			} else {
				;(obj[key] as TypeTree).__index = typeRef
			}
		} else {
			if (typeof obj[key] === 'object') {
				;(obj[key] as TypeTree).__index = typeRef
			} else {
				obj[key] = typeRef
			}
		}
		return
	}
	if (typeof obj[key] !== 'object') {
		const existing = obj[key] as string | undefined
		obj[key] = existing ? { __index: existing } : {}
	}
	setDeep(obj[key] as TypeTree, rest, typeRef, isIndex)
}

const tree: TypeTree = {}
for (const p of paths) {
	// Misma regla que buildLocaleObject() en _loader.ts: un archivo 'index.ts'
	// fusiona sus mensajes en el padre en vez de anidarse bajo la clave 'index'.
	// ej: 'pages/index' -> result.pages (no result.pages.index)
	const isIndex = p.endsWith('/index') || p === 'index'
	const parts = isIndex
		? p
				.replace(/\/index$/, '')
				.split('/')
				.filter(Boolean)
		: p.split('/')

	if (parts.length === 0) {
		// 'index.ts' suelto en la raíz de es/: no hay padre al que fusionar, se omite
		console.warn(`[i18n] ⚠️  Se ignora "${p}.ts": un "index.ts" en la raíz de es/ no tiene un padre al que fusionarse.`)
		continue
	}

	setDeep(tree, parts, `typeof ${aliasByPath.get(p)}`, isIndex)
}

function render(obj: TypeTree, indent = 2): string {
	const pad = ' '.repeat(indent)
	return Object.entries(obj)
		.filter(([key]) => key !== '__index')
		.map(([key, value]) => {
			if (typeof value === 'string') {
				return `${pad}${key}: NormalizeMessages<${value}>`
			}

			const treeVal = value as TypeTree
			const indexRef = treeVal.__index
			const childKeys = Object.keys(treeVal).filter(k => k !== '__index')

			if (childKeys.length === 0) {
				return indexRef ? `${pad}${key}: NormalizeMessages<${indexRef}>` : `${pad}${key}: {}`
			}

			const nestedObjStr = `{\n${render(treeVal, indent + 2)}\n${pad}}`

			if (indexRef) {
				return `${pad}${key}: NormalizeMessages<${indexRef} & ${nestedObjStr}>`
			}
			return `${pad}${key}: ${nestedObjStr}`
		})
		.join('\n')
}

// ---------------------------------------------------------------------------
// 4. Escribir src/locales/schema.ts
// ---------------------------------------------------------------------------
const content = `// ---------------------------------------------------------------------------
// ARCHIVO AUTOGENERADO por scripts/generate-i18n-schema.ts — NO EDITAR A MANO.
// Se regenera en cada "bun run dev" / "bun run build" (o "bun run i18n:types").
// ---------------------------------------------------------------------------
${imports}

/**
 * Normaliza el árbol de mensajes para que el autocompletado de claves de
 * vue-i18n incluya las claves cuyo valor es una función.
 *
 * vue-i18n v11 calcula las claves válidas de t() (Composition API) con el tipo
 * JsonPaths (@intlify/core-base), que recursa dentro de cualquier valor que
 * extienda Record<string, any> — y una función de mensaje ((ctx) => string)
 * sí lo extiende. Eso hace que JsonPaths "entre" en la función y genere rutas
 * basura (apply, call, name...), excluyendo la clave original del autocompletado.
 * Convertir las hojas función a \`string\` las marca como mensajes terminales.
 * Es un cambio types-only: no altera los mensajes en runtime ni el retorno de t().
 */
type NormalizeMessages<T> = {
	[K in keyof T]: T[K] extends (...args: never[]) => unknown
		? string
		: T[K] extends Record<string, unknown>
			? NormalizeMessages<T[K]>
			: T[K]
}

export interface MessageSchema {
${render(tree)}
}

declare module 'vue-i18n' {
	export interface DefineLocaleMessage extends MessageSchema {}
}
`

writeFileSync(OUTPUT, content)
console.log(`[i18n] ✅ typed-locale.d.ts generado (${paths.length} archivo(s) de mensajes detectados en "es/")`)
