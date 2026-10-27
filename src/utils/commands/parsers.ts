import type { LineRule, OutputParser, RegexPattern } from './types'

/**
 * Parsea la salida cruda de un comando SSH según la configuración del parser.
 */
export function parseOutput<T = unknown>(raw: string, parser: OutputParser): T {
  switch (parser.type) {
    case 'json':
      return parseJson<T>(raw)
    case 'line-based':
      return parseLineBased<T>(raw, parser.rules)
    case 'regex':
      return parseRegex<T>(raw, parser.patterns)
    case 'raw':
      return raw as T
  }
}

/**
 * Parsea la salida como JSON.
 * Maneja strings con prefijo/sufijo no-JSON (ej: warnings de apt).
 */
function parseJson<T>(raw: string): T {
  const trimmed = raw.trim()

  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as T
  }

  const arrStart = trimmed.indexOf('[')
  const arrEnd = trimmed.lastIndexOf(']')

  if (arrStart !== -1 && arrEnd > arrStart) {
    return JSON.parse(trimmed.slice(arrStart, arrEnd + 1)) as T
  }

  return JSON.parse(trimmed) as T
}

/**
 * Parser line-based: itera reglas sobre cada línea del output.
 */
function parseLineBased<T>(raw: string, rules: LineRule[]): T {
  const result: Record<string, unknown> = {}

  for (const line of raw.split('\n')) {
    for (const rule of rules) {
      const match = line.match(new RegExp(rule.match))
      if (match) {
        const value = applyTransform(match[1] ?? match[0], rule.transform)
        setAccumulated(result, rule.key, value)
      }
    }
  }

  return result as T
}

/**
 * Parser regex: aplica patrones con grupos de captura.
 */
function parseRegex<T>(raw: string, patterns: RegexPattern[]): T {
  const result: Record<string, unknown> = {}

  for (const { pattern, flags, groups } of patterns) {
    const regex = new RegExp(pattern, flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(raw)) !== null) {
      for (const [key, groupIndex] of Object.entries(groups)) {
        if (match[groupIndex] !== undefined) {
          setAccumulated(result, key, match[groupIndex].trim())
        }
      }
    }
  }

  return result as T
}

/**
 * Asigna un valor a `result[key]`, acumulando en array si la clave ya existe.
 */
function setAccumulated(result: Record<string, unknown>, key: string, value: unknown): void {
  if (key in result) {
    const current = result[key]
    if (Array.isArray(current)) {
      current.push(value)
    } else {
      result[key] = [current, value]
    }
  } else {
    result[key] = value
  }
}

function applyTransform(value: string, transform?: 'string' | 'number' | 'boolean'): unknown {
  switch (transform) {
    case 'number':
      return Number(value)
    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes'
    default:
      return value
  }
}