import { invoke } from '@tauri-apps/api/core'
import { getTableName } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import { relations } from './relations'
import * as tablesSchema from './schema'

const schema = tablesSchema

// ====================================================================
// Detección automática de campos cifrados desde el schema
// ====================================================================

interface EncryptedFieldInfo {
	tableName: string
	fieldName: string
	type: 'always' | 'conditional'
	conditionField?: string
}

/**
 * Inspecciona el schema de Drizzle y detecta qué campos usan encryptedText.
 *
 * - Sin fieldConfig → siempre cifrado (type: 'always')
 * - Con fieldConfig.condition → condicional (type: 'conditional')
 */
function detectEncryptedFieldsFromSchema(): EncryptedFieldInfo[] {
	const fields: EncryptedFieldInfo[] = []

	for (const [, table] of Object.entries(schema)) {
		if (typeof table !== 'object' || table === null) continue

		const dbTableName = getTableName(table as any)

		for (const [, column] of Object.entries(table)) {
			if (column?.columnType !== 'SQLiteCustomColumn') continue

			const fieldConfig = column.config?.fieldConfig

			if (!fieldConfig) {
				fields.push({
					tableName: dbTableName,
					fieldName: column.name,
					type: 'always',
				})
			} else if (fieldConfig.condition) {
				fields.push({
					tableName: dbTableName,
					fieldName: column.name,
					type: 'conditional',
					conditionField: fieldConfig.condition,
				})
			}
		}
	}

	return fields
}

const encryptedFieldsCache = detectEncryptedFieldsFromSchema()

// ====================================================================
// Helpers
// ====================================================================

function isWriteOperation(sql: string): boolean {
	const upper = sql.trim().toUpperCase()
	return upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')
}

function isReadOperation(sql: string): boolean {
	return sql.trim().toUpperCase().startsWith('SELECT')
}

// ====================================================================
// Parsing de SQL en frontend (para construir encryptMask)
// ====================================================================

/**
 * Extrae nombres de columna de un INSERT que tienen `?` como valor.
 *
 * Drizzle genera SQL como:
 *   INSERT INTO t (id, name, ...) VALUES (null, ?, ?, ?, null)
 *
 * Solo devuelve las columnas que SÍ tienen `?`, alineándolas con params.
 */
function parseInsertColumnsFromSQL(sql: string): string[] {
	const upper = sql.toUpperCase()

	const intoPos = upper.indexOf('INTO')
	if (intoPos === -1) return []

	const afterInto = sql.slice(intoPos + 4)

	const colOpen = afterInto.indexOf('(')
	if (colOpen === -1) return []

	const colClose = afterInto.indexOf(')', colOpen + 1)
	if (colClose === -1) return []

	const columnsStr = afterInto.slice(colOpen + 1, colClose)
	const columns = columnsStr
		.split(',')
		.map(c => c.trim().replace(/["`\[\]]/g, ''))
		.filter(c => c.length > 0)

	const valuesUpperAfter = upper.slice(colClose)
	const valuesPos = valuesUpperAfter.indexOf('VALUES')
	if (valuesPos === -1) return columns

	const valuesStart = colClose + valuesPos + 6
	const valuesSection = sql.slice(valuesStart).trim()

	const vOpen = valuesSection.indexOf('(')
	if (vOpen === -1) return columns

	const vClose = valuesSection.indexOf(')', vOpen + 1)
	if (vClose === -1) return columns

	const valuesStr = valuesSection.slice(vOpen + 1, vClose)
	const values = valuesStr.split(',').map(v => v.trim())

	return columns.filter((_, i) => values[i] === '?')
}

/**
 * Extrae nombres de columna de un UPDATE: SET col1 = ?, col2 = ?
 */
function parseUpdateColumnsFromSQL(sql: string): string[] {
	const upper = sql.toUpperCase()
	const setPos = upper.indexOf(' SET ')
	if (setPos === -1) return []

	const start = setPos + 5
	const wherePos = upper.indexOf(' WHERE ', start)
	const columnsSection = wherePos === -1 ? sql.slice(start) : sql.slice(start, wherePos)

	return columnsSection
		.split(',')
		.map(part => {
			const eq = part.indexOf('=')
			if (eq === -1) return null
			return part
				.slice(0, eq)
				.trim()
				.replace(/["`\[\]]/g, '')
		})
		.filter((c): c is string => c !== null && c.length > 0)
}

function parseColumnNamesFromSQL(sql: string): string[] {
	const upper = sql.trim().toUpperCase()
	if (upper.startsWith('INSERT')) return parseInsertColumnsFromSQL(sql)
	if (upper.startsWith('UPDATE')) return parseUpdateColumnsFromSQL(sql)
	return []
}

function isTruthy(val: unknown): boolean {
	if (typeof val === 'boolean') return val
	if (typeof val === 'number') return val !== 0
	if (typeof val === 'string') return val === 'true' || val === '1'
	return false
}

/**
 * Construye una máscara booleana indicando qué params deben cifrarse.
 *
 * Cada posición `i` del array returned indica si `params[i]` debe cifrarse.
 */
function buildEncryptMask(
	sql: string,
	params: unknown[],
	encryptedFieldsInfo: {
		encrypt: string[]
		conditionalEncrypt: { field: string; condition: string }[]
	},
): boolean[] {
	const columnNames = parseColumnNamesFromSQL(sql)

	return columnNames.map(col => {
		if (encryptedFieldsInfo.encrypt.includes(col)) return true

		const cond = encryptedFieldsInfo.conditionalEncrypt.find(c => c.field === col)
		if (cond) {
			const condIdx = columnNames.indexOf(cond.condition)
			if (condIdx >= 0) {
				return isTruthy(params[condIdx])
			}
			return false
		}

		return false
	})
}

/**
 * Obtiene los campos cifrados aplicables a una query SQL concreta.
 */
function getEncryptedFieldsForSQL(sql: string): {
	encrypt: string[]
	conditionalEncrypt: { field: string; condition: string }[]
} | null {
	const upper = sql.toUpperCase()
	const encrypt: string[] = []
	const conditionalEncrypt: { field: string; condition: string }[] = []

	for (const field of encryptedFieldsCache) {
		if (upper.includes(field.tableName.toUpperCase())) {
			if (field.type === 'always') {
				encrypt.push(field.fieldName)
			} else if (field.type === 'conditional' && field.conditionField) {
				conditionalEncrypt.push({
					field: field.fieldName,
					condition: field.conditionField,
				})
			}
		}
	}

	if (encrypt.length === 0 && conditionalEncrypt.length === 0) {
		return null
	}

	return { encrypt, conditionalEncrypt }
}

// ====================================================================
// Strip de valores cifrados en escrituras
// ====================================================================

const BLANK_VALUE = '__BLANK__e5362baf-c777-4d57-a609-6eaf1f9e87f6'
const ENC_PREFIX = 'ENC:'

/**
 * Determina si un valor es un placeholder/sentinel que debe ser ignorado
 * en escrituras (no persistir en BD).
 */
function isEncryptedPlaceholder(val: unknown): boolean {
	if (typeof val !== 'string') return false
	return val === BLANK_VALUE || val.startsWith(ENC_PREFIX)
}

/**
 * Elimina de una query de UPDATE las asignaciones a
 * columnas cifradas cuyo valor sea centinela o `ENC:*`, y reindexa los
 * params para mantener la alineación con los `?` restantes.
 *
 * IMPORTANTE: Drizzle cita identificadores con `"`.
 */
function stripEncryptedValues(
	sql: string,
	params: unknown[],
	encryptedFieldsInfo: {
		encrypt: string[]
		conditionalEncrypt: { field: string; condition: string }[]
	},
): { sql: string; params: unknown[] } {
	const columnNames = parseColumnNamesFromSQL(sql)
	if (columnNames.length === 0) return { sql, params }

	const allEncrypted = [...encryptedFieldsInfo.encrypt, ...encryptedFieldsInfo.conditionalEncrypt.map(c => c.field)]

	const upper = sql.trim().toUpperCase()
	if (!upper.startsWith('UPDATE')) return { sql, params }

	return stripUpdate(sql, params, columnNames, allEncrypted)
}

function stripUpdate(
	sql: string,
	params: unknown[],
	columnNames: string[],
	encryptedColumns: string[],
): { sql: string; params: unknown[] } {
	const upper = sql.toUpperCase()
	const setPos = upper.indexOf(' SET ')
	const start = setPos + 5
	const wherePos = upper.indexOf(' WHERE ', start)
	const whereClause = wherePos === -1 ? '' : sql.slice(wherePos)
	const setSection = wherePos === -1 ? sql.slice(start) : sql.slice(start, wherePos)

	const setParts = setSection.split(',')
	const keptParts: string[] = []
	const keptParams: unknown[] = []

	for (let i = 0; i < columnNames.length; i++) {
		const col = columnNames[i]
		const val = params[i]

		if (encryptedColumns.includes(col) && isEncryptedPlaceholder(val)) {
			continue
		}

		keptParts.push(setParts[i])
		keptParams.push(val)
	}

	if (keptParts.length === columnNames.length) {
		return { sql, params }
	}

	const newSet = keptParts.join(', ')
	const prefix = sql.slice(0, start)
	const newSql = `${prefix}${newSet}${whereClause}`

	const whereParams = params.slice(columnNames.length)

	return { sql: newSql, params: [...keptParams, ...whereParams] }
}

// ====================================================================
// Control de descifrado (global + por operación)
// ====================================================================

const DEFAULT_DECRYPT = false

let _decryptEnabled = DEFAULT_DECRYPT

/**
 * Ejecuta una función con control explícito del descifrado.
 *
 * - `false` → el backend enmascara campos cifrados con `BLANK_VALUE`
 *   (el frontend nunca ve `ENC:`).
 * - `true` → el backend descifra y devuelve texto plano.
 *
 * @example
 * // Con enmascaramiento (valor por defecto)
 * const rows = await db.select().from(hosts)...
 *
 * // Con descifrado explícito
 * const raw = await withDecryption(true, () =>
 *   db.select().from(passkeys)...
 * )
 */
export function withDecryption<T>(enabled: boolean, fn: () => T): T {
	const prev = _decryptEnabled
	_decryptEnabled = enabled
	try {
		return fn()
	} finally {
		_decryptEnabled = prev
	}
}

// ====================================================================
// Proxy Drizzle → Tauri
// ====================================================================

interface QueryRawResponse {
	success: boolean
	data: unknown[][] | null
	message_key?: string
	message_params?: Record<string, string>
}

/**
 * Error lanzado por el proxy cuando el backend responde `success: false`.
 *
 * Conserva la clave i18n y los parámetros del `CommandResponse` original,
 * para que las capas superadoras (composables de query) puedan traducirlo.
 */
export class QueryRawError extends Error {
	readonly message_key: string
	readonly message_params: Record<string, string>

	constructor(messageKey: string, messageParams: Record<string, string> = {}) {
		super(messageKey)
		this.name = 'QueryRawError'
		this.message_key = messageKey
		this.message_params = messageParams
	}
}

export const db = drizzle(
	async (sql, params, method) => {
		const encryptedFields = getEncryptedFieldsForSQL(sql)
		const hasEncryption =
			encryptedFields && (encryptedFields.encrypt.length > 0 || encryptedFields.conditionalEncrypt.length > 0)

		const isWrite = isWriteOperation(sql)
		const isRead = isReadOperation(sql)

		let finalSql = sql
		let finalParams = params ?? []

		// Escrituras: strip de valores centinela/ENC: antes del invoke
		if (hasEncryption && isWrite) {
			const stripped = stripEncryptedValues(finalSql, finalParams, encryptedFields!)
			finalSql = stripped.sql
			finalParams = stripped.params
		}

		const encryptMask = hasEncryption && isWrite ? buildEncryptMask(finalSql, finalParams, encryptedFields!) : null

		// Lecturas: maskFields cuando no hay descifrado explícito
		const maskFields =
			hasEncryption && isRead && !_decryptEnabled
				? [...encryptedFields!.encrypt, ...encryptedFields!.conditionalEncrypt.map(c => c.field)]
				: null

		const response = await invoke<QueryRawResponse>('query_raw', {
			sql: finalSql,
			params: finalParams,
			encryptMask,
			decryptFields: hasEncryption && isRead && _decryptEnabled ? encryptedFields!.encrypt : null,
			maskFields,
			isWrite,
			isRead,
		})

		if (!response.success) {
			throw new QueryRawError(response.message_key ?? 'query_raw failed', response.message_params)
		}

		const rows = response.data ?? []
		return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
	},
	{ relations },
)
