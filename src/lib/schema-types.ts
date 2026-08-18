import { customType } from 'drizzle-orm/sqlite-core'

interface EncryptedTextConfig {
  /** Si se especifica, el campo solo se cifra cuando esta condición es true */
  condition?: string
}

/**
 * Tipo personalizado que marca un campo como necesitado de cifrado.
 *
 * - Siempre cifrado: encryptedText('password')
 * - Condicional:     encryptedText('value', { condition: 'is_secret' })
 *
 * El cifrado/descifrado lo hace Rust via query_raw_with_encryption.
 */
export function encryptedText(columnName: string, config?: EncryptedTextConfig) {
  return customType<{
    data: string
    driverData: string
    config: EncryptedTextConfig | undefined
  }>({
    dataType() {
      return 'text'
    },
    toDriver(value: string): string {
      return value
    },
    fromDriver(value: string): string {
      return value
    },
  })(columnName, config)
}
