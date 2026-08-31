/**
 * generate-table-names.ts
 *
 * Genera src-tauri/src/tables.rs a partir de las entidades Drizzle
 * en src/lib/entities/*.ts. Extrae el nombre de tabla de cada
 * sqliteTable('name', ...) y genera constantes Rust.
 *
 * Se ejecuta con: bun run tables:generate
 *
 * NO EDITAR src-tauri/src/tables.rs a mano: se sobreescribe en cada ejecución.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const __dirname = import.meta.dir
const ENTITIES_DIR = join(__dirname, '../src/lib/entities')
const OUTPUT = join(__dirname, '../src-tauri/src/tables.rs')

// Regex para extraer el nombre de tabla de sqliteTable('name', ...)
const TABLE_REGEX = /sqliteTable\(\s*['"]([^'"]+)['"]/g

// Mapeo de nombre de archivo → constante Rust
// El nombre de la constante se deriva del nombre del archivo (sin extensión)
// Ej: projects_docker_compose.ts → TABLE_PROJECTS_DOCKER_COMPOSE
function fileNameToConstName(fileName: string): string {
	const name = fileName.replace(/\.ts$/, '')
	const parts = name.split('_')
	return 'TABLE_' + parts.map(p => p.toUpperCase()).join('_')
}

interface TableInfo {
	constName: string
	tableName: string
	fileName: string
}

const tables: TableInfo[] = []

const files = readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.ts'))

for (const file of files) {
	const content = readFileSync(join(ENTITIES_DIR, file), 'utf-8')
	const matches = [...content.matchAll(TABLE_REGEX)]

	if (matches.length === 0) {
		console.warn(`[tables] ⚠️  No se encontró sqliteTable() en ${file}`)
		continue
	}

	// Usar la primera coincidencia (cada archivo define una tabla principal)
	const tableName = matches[0][1]
	const constName = fileNameToConstName(file)

	tables.push({ constName, tableName, fileName: file })
}

if (tables.length === 0) {
	console.error('[tables] ❌ No se encontraron tablas en src/lib/entities/')
	process.exit(1)
}

// Generar el archivo Rust
const rustContent = `// ---------------------------------------------------------------------------
// ARCHIVO AUTOGENERADO por scripts/generate-table-names.ts — NO EDITAR A MANO.
// Se regenera con: bun run tables:generate
// ---------------------------------------------------------------------------

${tables.map(t => `/// Tabla: ${t.tableName} (fuente: ${t.fileName})\npub const ${t.constName}: &str = "${t.tableName}";`).join('\n\n')}
`

writeFileSync(OUTPUT, rustContent)
console.log(`[tables] ✅ tables.rs generado (${tables.length} tabla(s) detectadas en entities/)`)

for (const t of tables) {
	console.log(`  ${t.constName} = "${t.tableName}"`)
}
