import { invoke } from '@tauri-apps/api/core'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import {
	decryptRow,
	encryptParams,
	getEncryptedFieldsForSQL,
	isDecryptEnabled,
	isReadOperation,
	isWriteOperation,
	maskEncryptedFields,
	stripEncryptedValues,
} from '@/drizzle/lib/crypto'
import type { QueryRawResponse } from '@/drizzle/drizzle.interfaces'
import { relations } from '@/drizzle/relations'

export { withDecryption } from '@/drizzle/lib/crypto'

// ====================================================================
// Error tipado del comando query_raw
// ====================================================================

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

// ====================================================================
// Proxy Drizzle → Tauri
// ====================================================================

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

			if (isDecryptEnabled()) {
				rows = await Promise.all(rows.map(row => decryptRow(row, colNames, encryptedFields!)))
			} else {
				rows = rows.map(row => maskEncryptedFields(row, colNames, encryptedFields!))
			}
		}

		return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
	},
	{ relations },
)