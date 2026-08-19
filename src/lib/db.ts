import { invoke } from '@tauri-apps/api/core'
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
 * - Sin config → siempre cifrado (type: 'always')
 * - Con config.condition → condicional (type: 'conditional')
 */
function detectEncryptedFieldsFromSchema(): EncryptedFieldInfo[] {
  const fields: EncryptedFieldInfo[] = []

  for (const [tableName, table] of Object.entries(schema)) {
    if (typeof table !== 'object' || table === null) continue

    for (const [colName, col] of Object.entries(table)) {
      const column = col as any

      if (column?.columnType !== 'SQLiteCustomColumn') continue

      const config = column.config

      if (!config) {
        fields.push({
          tableName,
          fieldName: colName,
          type: 'always',
        })
      } else if (config.condition) {
        fields.push({
          tableName,
          fieldName: colName,
          type: 'conditional',
          conditionField: config.condition,
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

function getEncryptedFieldsForSQL(sql: string): {
  encrypt: string[]
  conditionalEncrypt: { field: string, condition: string }[]
} | null {
  const upper = sql.toUpperCase()
  const encrypt: string[] = []
  const conditionalEncrypt: { field: string, condition: string }[] = []

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
// Proxy Drizzle → Tauri
// ====================================================================

interface QueryRawResponse {
  success: boolean
  data: unknown[][] | null
  message_key?: string
  message_params?: Record<string, string>
}

export const db = drizzle(
  async (sql, params, method) => {
    const encryptedFields = getEncryptedFieldsForSQL(sql)
    const hasEncryption = encryptedFields && (
      encryptedFields.encrypt.length > 0 ||
      encryptedFields.conditionalEncrypt.length > 0
    )

    // Escritura con cifrado
    if (hasEncryption && isWriteOperation(sql)) {
      const response = await invoke<QueryRawResponse>('query_raw_with_encryption', {
        sql,
        params: params ?? [],
        encryptFields: encryptedFields!.encrypt,
        conditionalEncrypt: encryptedFields!.conditionalEncrypt,
      })

      if (!response.success) {
        throw new Error(response.message_key ?? 'query_raw failed')
      }

      const rows = response.data ?? []
      return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
    }

    // Lectura con descifrado
    if (hasEncryption && isReadOperation(sql)) {
      const response = await invoke<QueryRawResponse>('query_raw_with_encryption', {
        sql,
        params: params ?? [],
        decryptFields: encryptedFields!.encrypt,
      })

      if (!response.success) {
        throw new Error(response.message_key ?? 'query_raw failed')
      }

      const rows = response.data ?? []
      return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
    }

    // Sin cifrado → query_raw normal
    const response = await invoke<QueryRawResponse>('query_raw', {
      sql,
      params: params ?? [],
    })

    if (!response.success) {
      throw new Error(response.message_key ?? 'query_raw failed')
    }

    const rows = response.data ?? []
    return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
  },
  { relations },
)
