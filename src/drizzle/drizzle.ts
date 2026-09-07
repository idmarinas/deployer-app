import { invoke } from '@tauri-apps/api/core'
import { getTableName } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import { decrypt, encrypt, encryptScope } from '@/drizzle/lib/stronghold'
import { relations } from '@/drizzle/relations'
import * as tablesSchema from '@/drizzle/schema'

const schema = tablesSchema

const BLANK_VALUE = '__BLANK__e5362baf-c777-4d57-a609-6eaf1f9e87f6'
const ENC_PREFIX = 'ENC:'

// ====================================================================
// Detección automática de campos cifrados desde el schema
// ====================================================================

interface EncryptedFieldInfo {
	tableName: string
	fieldName: string
	type: 'always' | 'conditional'
	conditionField?: string
}

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
// Parsing de SQL en frontend
// ====================================================================

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

// ====================================================================
// Strip de valores cifrados en escrituras (sentinel/ENC:)
// ====================================================================

function isEncryptedPlaceholder(val: unknown): boolean {
	if (typeof val !== 'string') return false
	return val === BLANK_VALUE || val.startsWith(ENC_PREFIX)
}

function stripEncryptedValues(
	sql: string,
	params: unknown[],
	encryptedFieldsInfo: EncryptedFieldsInfo,
): { sql: string; params: unknown[] } {
	const columnNames = parseColumnNamesFromSQL(sql)
	if (columnNames.length === 0) return { sql, params }

	const allEncrypted = [
		...encryptedFieldsInfo.encrypt.map(f => f.field),
		...encryptedFieldsInfo.conditionalEncrypt.map(c => c.field),
	]

	const upper = sql.trim().toUpperCase()
	if (!upper.startsWith('UPDATE')) return { sql, params }

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

		if (allEncrypted.includes(col) && isEncryptedPlaceholder(val)) {
			continue
		}

		keptParts.push(setParts[i]!)
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
// Construcción de encryptMask y detección de campos cifrados
// ====================================================================

interface EncryptedFieldRef {
	table: string
	field: string
}

interface EncryptedFieldsInfo {
	encrypt: EncryptedFieldRef[]
	conditionalEncrypt: (EncryptedFieldRef & { condition: string })[]
}

function getEncryptedFieldsForSQL(sql: string): EncryptedFieldsInfo | null {
	const upper = sql.toUpperCase()
	const encrypt: EncryptedFieldRef[] = []
	const conditionalEncrypt: (EncryptedFieldRef & { condition: string })[] = []

	for (const field of encryptedFieldsCache) {
		if (upper.includes(field.tableName.toUpperCase())) {
			if (field.type === 'always') {
				encrypt.push({ table: field.tableName, field: field.fieldName })
			} else if (field.type === 'conditional' && field.conditionField) {
				conditionalEncrypt.push({
					table: field.tableName,
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
// Control de descifrado (global + por operación)
// ====================================================================

const DEFAULT_DECRYPT = false

let _decryptEnabled = DEFAULT_DECRYPT

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
// Cifrado/descifrado de parámetros y filas
// ====================================================================

async function encryptParams(
	params: unknown[],
	sql: string,
	encryptedFieldsInfo: EncryptedFieldsInfo,
): Promise<unknown[]> {
	const columnNames = parseColumnNamesFromSQL(sql)
	if (columnNames.length === 0) return params

	return Promise.all(
		params.map(async (val, i) => {
			const col = columnNames[i]
			if (col === undefined) return val
			if (typeof val !== 'string') return val
			if (val === '' || val.startsWith(ENC_PREFIX) || val === BLANK_VALUE) return val

			const ref = encryptedFieldsInfo.encrypt.find(f => f.field === col)
			if (ref) {
				return await encrypt(encryptScope(ref.table, col), val)
			}

			const cond = encryptedFieldsInfo.conditionalEncrypt.find(c => c.field === col)
			if (cond) {
				const condIdx = columnNames.indexOf(cond.condition)
				if (condIdx >= 0 && isTruthy(params[condIdx])) {
					return await encrypt(encryptScope(cond.table, col), val)
				}
			}

			return val
		}),
	)
}

/** Resuelve el scope de un campo de una fila, o `null` si no es cifrado/active. */
function getEncryptedScopeForRow(
	row: unknown[],
	colNames: string[],
	colName: string,
	info: EncryptedFieldsInfo,
): string | null {
	const idx = colNames.indexOf(colName)
	if (idx === -1 || typeof row[idx] !== 'string') return null

	// Campos siempre cifrados
	const ref = info.encrypt.find(f => f.field === colName)
	if (ref) return encryptScope(ref.table, colName)

	// Campos condicionales: se cifran solo si la columna condición es verdadera
	const cond = info.conditionalEncrypt.find(c => c.field === colName)
	if (cond) {
		const condIdx = colNames.indexOf(cond.condition)
		if (condIdx >= 0 && isTruthy(row[condIdx])) {
			return encryptScope(cond.table, colName)
		}
	}

	return null
}

async function decryptRow(row: unknown[], colNames: string[], info: EncryptedFieldsInfo): Promise<unknown[]> {
	return Promise.all(
		row.map(async (val, i) => {
			const colName = colNames[i]
			if (colName === undefined) return val
			if (typeof val !== 'string') return val
			if (!val.startsWith(ENC_PREFIX)) return val

			const scope = getEncryptedScopeForRow(row, colNames, colName, info)
			if (!scope) return val

			try {
				return await decrypt(scope, val)
			} catch {
				return val
			}
		}),
	)
}

function maskEncryptedFields(row: unknown[], colNames: string[], info: EncryptedFieldsInfo): unknown[] {
	return row.map((val, i) => {
		const colName = colNames[i]
		if (colName === undefined) return val
		if (typeof val !== 'string') return val
		if (!val.startsWith(ENC_PREFIX)) return val
		if (!getEncryptedScopeForRow(row, colNames, colName, info)) return val
		return BLANK_VALUE
	})
}

// ====================================================================
// Proxy Drizzle → Tauri
// ====================================================================

interface QueryRawResponse {
	success: boolean
	data: { columns: string[]; rows: unknown[][] } | null
	message_key?: string
	message_params?: Record<string, string>
}

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

		// Escrituras: strip de sentinel/ENC: y cifrado con Stronghold
		if (hasEncryption && isWrite) {
			const stripped = stripEncryptedValues(finalSql, finalParams, encryptedFields!)
			finalSql = stripped.sql
			finalParams = stripped.params

			finalParams = await encryptParams(finalParams, finalSql, encryptedFields!)
		}

		// Ejecutar query (sin parámetros de cifrado/descifrado — Rust solo ejecuta SQL)
		const response = await invoke<QueryRawResponse>('query_raw', {
			sql: finalSql,
			params: finalParams,
		})

		if (!response.success) {
			throw new QueryRawError(response.message_key ?? 'query_raw failed', response.message_params)
		}

		const result = response.data
		let rows = result?.rows ?? []

		// Lecturas: descifrar o enmascarar los campos cifrados.
		// Los nombres de columna vienen del backend (QueryRawResult.columns);
		// sirven solo para localizar por índice la columna condición de los
		// campos condicionales dentro de cada fila.
		if (hasEncryption && isRead && rows.length > 0) {
			const colNames = result?.columns ?? []

			if (_decryptEnabled) {
				rows = await Promise.all(rows.map(row => decryptRow(row, colNames, encryptedFields!)))
			} else {
				rows = rows.map(row => maskEncryptedFields(row, colNames, encryptedFields!))
			}
		}

		return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
	},
	{ relations },
)
