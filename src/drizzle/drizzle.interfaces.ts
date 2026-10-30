// ====================================================================
// Interfaces del proxy Drizzle → Tauri
// ====================================================================

/** Campo cifrado autodetectado desde el schema (`encryptedText(...)`). */
export interface EncryptedFieldInfo {
	tableName: string
	fieldName: string
	type: 'always' | 'conditional'
	conditionField?: string
}

/** Referencia `tabla.columna` de un campo cifrado. */
export interface EncryptedFieldRef {
	table: string
	field: string
}

/** Campos cifrados implicados en una sentencia SQL. */
export interface EncryptedFieldsInfo {
	encrypt: EncryptedFieldRef[]
	conditionalEncrypt: (EncryptedFieldRef & { condition: string })[]
}

/** Respuesta del comando Rust `query_raw`. */
export interface QueryRawResponse {
	success: boolean
	data: { columns: string[]; rows: unknown[][] } | null
	message_key?: string
	message_params?: Record<string, string>
}