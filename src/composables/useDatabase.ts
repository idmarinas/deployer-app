import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
import { CommandResponse } from '../types/tauri-types'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface SelectResult<T> {
  data: T[] | null
  error: string | null
}

export interface ExecuteResult {
  rowsAffected: number
  lastInsertId?: number
  error: string | null
}

export interface FirstResult<T> {
  data: T | null
  error: string | null
}

export interface TransactionResult {
  error: string | null
}

// ─── Singleton de conexión (nivel módulo) ─────────────────────────────────────

const db = ref<Database | null>(null)
let loadPromise: Promise<void> | null = null

/**
 * Inicializa la conexión una sola vez. Las llamadas concurrentes esperan
 * a que la primera termine en lugar de abrir múltiples conexiones.
 */
async function ensureConnection(): Promise<string | null> {
  if (db.value) return null

  if (!loadPromise) {
    loadPromise = (async () => {
      const response = await invoke<CommandResponse>('get_database_url')

      if (!response.success || !response.data) {
        loadPromise = null
        return
      }

      db.value = await Database.load(response.data)
    })()
  }

  try {
    await loadPromise
  } catch (e) {
    loadPromise = null
    return `Error al conectar con la base de datos: ${e}`
  }

  if (!db.value) {
    return 'No se pudo obtener la URL de la base de datos. Comprueba que la ruta está configurada.'
  }

  return null
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useDatabase() {
  /**
   * Carga la conexión manualmente si aún no está abierta.
   * Útil para forzar la inicialización en el paso de seed del setup.
   */
  async function load(): Promise<TransactionResult> {
    const error = await ensureConnection()
    return { error }
  }

  /**
   * Ejecuta una consulta SELECT y devuelve un array de resultados tipados.
   */
  async function select<T>(sql: string, params: unknown[] = []): Promise<SelectResult<T>> {
    const error = await ensureConnection()

    if (error) return { data: null, error }

    try {
      const data = await db.value!.select<T[]>(sql, params)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  /**
   * Devuelve únicamente el primer resultado de un SELECT, o null si no hay filas.
   */
  async function first<T>(sql: string, params: unknown[] = []): Promise<FirstResult<T>> {
    const result = await select<T>(sql, params)

    if (result.error) return { data: null, error: result.error }

    return { data: result.data?.[0] ?? null, error: null }
  }

  /**
   * Ejecuta una sentencia INSERT, UPDATE o DELETE.
   * Devuelve el número de filas afectadas y el último ID insertado.
   */
  async function execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const error = await ensureConnection()

    if (error) return { rowsAffected: 0, lastInsertId: 0, error }

    try {
      const result = await db.value!.execute(sql, params)
      return {
        rowsAffected: result.rowsAffected,
        lastInsertId: result.lastInsertId,
        error: null
      }
    } catch (e) {
      return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
    }
  }

  /**
   * Ejecuta un callback dentro de una transacción.
   * Si el callback lanza una excepción, hace ROLLBACK automático.
   * Si todo va bien, hace COMMIT.
   * Similar al patrón Unit of Work de Doctrine ORM.
   *
   * IMPORTANTE: Dentro del callback, usar siempre las variantes OrThrow
   * de los métodos de useQuery (ej. saveAppSettingsOrThrow) para que los
   * errores se propaguen correctamente y el ROLLBACK se ejecute.
   */
  async function transaction<T>(callback: () => Promise<T>): Promise<T> {
    const connError = await ensureConnection()
    if (connError) throw new Error(connError)

    await db.value!.execute('BEGIN')

    try {
      const result = await callback()
      await db.value!.execute('COMMIT')
      return result
    } catch (e) {
      await db.value!.execute('ROLLBACK')
      throw e
    }
  }

  /**
   * Inicia una transacción explícita.
   */
  async function beginTransaction(): Promise<TransactionResult> {
    const error = await ensureConnection()

    if (error) return { error }

    try {
      await db.value!.execute('BEGIN')
      return { error: null }
    } catch (e) {
      return { error: String(e) }
    }
  }

  /**
   * Confirma la transacción activa.
   */
  async function commit(): Promise<TransactionResult> {
    const error = await ensureConnection()

    if (error) return { error }

    try {
      await db.value!.execute('COMMIT')
      return { error: null }
    } catch (e) {
      return { error: String(e) }
    }
  }

  /**
   * Revierte la transacción activa.
   */
  async function rollback(): Promise<TransactionResult> {
    const error = await ensureConnection()

    if (error) return { error }

    try {
      await db.value!.execute('ROLLBACK')
      return { error: null }
    } catch (e) {
      return { error: String(e) }
    }
  }

  return {
    db,
    load,
    select,
    first,
    execute,
    transaction,
    beginTransaction,
    commit,
    rollback
  }
}
