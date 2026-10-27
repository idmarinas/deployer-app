/**
 * Definición de un comando remoto: ejecuta un comando en un servidor SSH
 * y parsea la salida según la configuración del parser.
 *
 * La fuente única de las definiciones es la tabla `deployer_commands` (BD);
 * este tipo solo modela la fila mapeada para el runner.
 */
export interface CommandDefinition {
  /** Identificador único del comando (columna `key`, PK) */
  id: string
  /** Nombre legible */
  name: string
  /** Comando bash a ejecutar en el servidor */
  command: string
  /** Configuración del parser de salida */
  parser: OutputParser
  /** Timeout personalizado en segundos (default: 300) */
  timeout_secs?: number
}

/**
 * Configuración del parser de salida del comando.
 */
export type OutputParser =
  | { type: 'json' }
  | { type: 'line-based'; rules: LineRule[] }
  | { type: 'regex'; patterns: RegexPattern[] }
  | { type: 'raw' }

/**
 * Regla para parser line-based: matchea una línea y extrae un valor.
 */
export interface LineRule {
  /** Regex que matchea la línea */
  match: string
  /** Clave del resultado */
  key: string
  /** Transformación del valor extraído */
  transform?: 'string' | 'number' | 'boolean'
}

/**
 * Patrón regex para extracción de grupos de captura.
 */
export interface RegexPattern {
  /** Regex con grupos de captura (sintaxis JS) */
  pattern: string
  /** Flags del regex (ej: 'gm') */
  flags?: string
  /** Mapeo de grupos a claves del resultado */
  groups: Record<string, number>
}

/**
 * Resultado de ejecutar un comando remoto.
 */
export interface CommandRunResult<T = unknown> {
  /** Código de salida del comando */
  exit_code: number
  /** Salida cruda del comando */
  raw_output: string
  /** Salida parseada */
  parsed: T
  /** Duración de la ejecución en segundos */
  duration_seconds: number
}