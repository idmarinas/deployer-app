/**
 * generate-table-names.ts
 *
 * Genera dos archivos en src-tauri/src/ a partir de las entidades Drizzle
 * en src/lib/entities/*.ts:
 *
 *  1. tables.rs   — constantes con el nombre de cada tabla (sqliteTable('...'))
 *  2. files.rs    — schema de tablas con patrón "_files" (mismo shape de columnas)
 *                   más el struct común de retorno.
 *
 * La tabla "_files" usa un patrón FIJO de columnas (el de file_table en
 * columns.helpers.ts). Solo cambia el nombre de la tabla y la columna FK
 * (referencia al padre). Las entidades que califiquen como patrón "_files"
 * se detectan automáticamente por la presencia de las columnas:
 *   file_path + is_binary + webkit_relative_path
 *
 * Se ejecuta con: bun run tables:generate
 *
 * NO EDITAR tables.rs ni files.rs a mano: se sobreescriben en cada ejecución.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { file_table } from '../src/drizzle/lib/columns.helpers'

const __dirname = import.meta.dir
const ENTITIES_DIR = join(__dirname, '../src/drizzle/entities')
const TABLES_OUTPUT = join(__dirname, '../src-tauri/src/tables.rs')
const FILES_OUTPUT = join(__dirname, '../src-tauri/src/files.rs')

// Regex para extraer el nombre de tabla de sqliteTable('name', ...)
const TABLE_REGEX = /sqliteTable\(\s*['"]([^'"]+)['"]/g

// Marcador del patrón "tabla de archivos": la entidad esparce el helper
// file_table definido en src/lib/columns.helpers.ts
const FILES_PATTERN_SPREAD = '...file_table'

// Timestamps gestionados en el backend (y deleted_at es soft-delete): se
// excluyen de FILES_EDITABLE (se gestionan aparte) y no se persisten vía input.
const FILES_TIMESTAMPS = new Set(['created_at', 'updated_at', 'deleted_at'])

// Columnas del helper file_table (objeto builder de Drizzle). Orden real =
// el de definición del objeto. module_id se fuerza primero en FILES_EDITABLE.
type FileTableColumn = {
	config: {
		notNull: boolean
		primaryKey: boolean
		dataType: string
		columnType: string
		mode?: string
		enumValues?: string[]
	}
}

// Todas las columnas (para SELECT y el struct de retorno), con la PK id primera.
const FILES_COLUMNS: string[] = ['id', ...Object.keys(file_table).filter(k => k !== 'id')]

// Columnas editables en INSERT/UPDATE (excluye PK y timestamps).
// module_id va primero (la FK al padre); el resto conserva el orden del objeto.
const FILES_EDITABLE: string[] = [
	'module_id',
	...Object.keys(file_table).filter(k => k !== 'module_id' && k !== 'id' && !FILES_TIMESTAMPS.has(k)),
]

// Mapea la config de una columna Drizzle a su tipo Rust (con Option si es nullable).
function rustTypeFor(col: FileTableColumn): string {
	const dataType = col.config.dataType
	let base: string
	if (dataType === 'boolean') base = 'bool'
	else if (dataType === 'number int53') base = 'i64'
	else base = 'String'
	return col.config.notNull ? base : `Option<${base}>`
}

// Mapeo de nombre de archivo → constante Rust del nombre de tabla
// Ej: projects_docker_compose_files.ts → TABLE_PROJECTS_DOCKER_COMPOSE_FILES
function fileNameToConstName(fileName: string): string {
	const name = fileName.replace(/\.ts$/, '')
	return 'TABLE_' + name.toUpperCase()
}

// Mapeo de nombre de archivo → constante Rust del FilesTable
// Ej: projects_docker_compose_files.ts → COMPOSE_FILES
function fileNameToFilesConst(fileName: string): string {
	const name = fileName
		.replace(/\.ts$/, '')
		.replace(/^(projects_|cache_)/, '')
		.replace(/_files$/, '')
	return name.toUpperCase() + '_FILES'
}

function isFilesPattern(content: string): boolean {
	return content.includes(FILES_PATTERN_SPREAD)
}

// Constante Rust (p.ej. DOCKER_COMPOSE_FILES) → variante enum PascalCase
// (p.ej. DockerComposeFiles). Con serde rename_all = "snake_case" serializa de
// nuevo a "docker_compose_files" (el mismo id string que usaba el frontend).
function constToVariant(constName: string): string {
	return constName
		.split('_')
		.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
		.join('')
}

// ==================================================================
// Tablas
// ==================================================================

interface TableInfo {
	constName: string
	tableName: string
	fileName: string
}

const tables: TableInfo[] = []
const filesTableDefs: { constName: string; tableConst: string; fileName: string }[] = []

const files = readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.ts'))

for (const file of files) {
	const content = readFileSync(join(ENTITIES_DIR, file), 'utf-8')
	const matches = [...content.matchAll(TABLE_REGEX)]

	if (matches.length === 0) {
		console.warn(`[tables] ⚠️  No se encontró sqliteTable() en ${file}`)
		continue
	}

	const tableName = matches[0][1]
	const tableConst = fileNameToConstName(file)
	tables.push({ constName: tableConst, tableName, fileName: file })

	if (isFilesPattern(content)) {
		filesTableDefs.push({ constName: fileNameToFilesConst(file), tableConst, fileName: file })
	}
}

if (tables.length === 0) {
	console.error('[tables] ❌ No se encontraron tablas en src/lib/entities/')
	process.exit(1)
}

// ==================================================================
// tables.rs
// ==================================================================

const tablesContent = `// ---------------------------------------------------------------------------
// ARCHIVO AUTOGENERADO por scripts/generate-table-names.ts — NO EDITAR A MANO.
// Se regenera con: bun run tables:generate
// ---------------------------------------------------------------------------

${tables.map(t => `/// Tabla: ${t.tableName} (fuente: ${t.fileName})\npub const ${t.constName}: &str = "${t.tableName}";`).join('\n\n')}
`

// ==================================================================
// Structs del patrón _files (Rust)
// ==================================================================

// Declaraciones de campo del struct ModuleFile, derivadas de file_table.
const structFields = FILES_COLUMNS.map(c => {
	const type_ = rustTypeFor(file_table[c] as FileTableColumn)
	return `    pub ${c}: ${type_},`
}).join('\n')

const filesContent = `// ---------------------------------------------------------------------------
// ARCHIVO AUTOGENERADO por scripts/generate-table-names.ts — NO EDITAR A MANO.
// Se regenera con: bun run tables:generate
//
// Schema de tablas con patrón "_files" y struct común de retorno.
// Columnas y struct derivados de file_table en src/lib/columns.helpers.ts;
// lo único que varía por entidad es el nombre de la tabla y la columna FK
// que referencia al módulo padre (por defecto "module_id").
// ---------------------------------------------------------------------------

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;

use crate::tables;

/// Columnas editables en INSERT/UPDATE (excluye PK y timestamps; la FK va primera).
pub const FILES_EDITABLE: &[&str] = &[
${FILES_EDITABLE.map(c => `    "${c}",`).join('\n')}
];

/// Descripción de una tabla con patrón "_files".
pub struct FilesTable {
    /// Nombre de la tabla (constante de crate::tables).
    pub table: &'static str,
    /// Columna que referencia al módulo padre.
    pub fk: &'static str,
}

/// Struct común de retorno para las tablas con patrón "_files".
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct ModuleFile {
${structFields}
}

// ── Instancias por entidad ─────────────────────────────────────────
${filesTableDefs.map(f => `/// Tabla _files de: ${f.fileName}\npub const ${f.constName}: FilesTable = FilesTable {\n    table: tables::${f.tableConst},\n    fk: "module_id",\n};`).join('\n\n')}

/// Identificador de una tabla "_files". Serde lo serializa en snake_case del
/// variante (p.ej. DockerComposeFiles -> "docker_compose_files"), el mismo
/// valor string que usaba el frontend como id de tabla.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[serde(rename_all = "snake_case")]
pub enum FilesTableId {
${filesTableDefs.map(f => `    ${constToVariant(f.constName)},`).join('\n')}
}

impl FilesTableId {
    /// FilesTable correspondiente a este identificador.
    pub fn schema(self) -> &'static FilesTable {
        match self {
${filesTableDefs.map(f => `            Self::${constToVariant(f.constName)} => &${f.constName},`).join('\n')}
        }
    }
}
`

writeFileSync(TABLES_OUTPUT, tablesContent)
console.log(`[tables] ✅ tables.rs generado (${tables.length} tabla(s))`)

// writeFileSync(FILES_OUTPUT, filesContent)
// console.log(`[tables] ✅ files.rs generado (${filesTableDefs.length} entidad(es) con patrón _files)`)

for (const t of tables) {
	console.log(`  ${t.constName} = "${t.tableName}"`)
}

for (const f of filesTableDefs) {
	console.log(`  ${f.constName} (${f.fileName}) → tabla ${f.tableConst}`)
}
