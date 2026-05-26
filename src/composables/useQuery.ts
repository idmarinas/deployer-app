import { type ExecuteResult, useDatabase } from './useDatabase'
import { DB_TABLES } from '@/constants/dbTables'

export function useQuery() {
  const { db: database } = useDatabase()

  // ─── App Settings ─────────────────────────────────────────────────────────

  async function saveAppSettingOrThrow(key: string, value: string): Promise<ExecuteResult> {
    const result = await database.value!.execute(
      `INSERT INTO ${DB_TABLES.APP_SETTINGS} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId,
      error: null
    }
  }

  async function saveAppSetting(key: string, value: string): Promise<ExecuteResult> {
    try {
      return await saveAppSettingOrThrow(key, value)
    } catch (e) {
      console.error('Error saving app setting:', e)
      return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
    }
  }

  async function saveAppSettingsOrThrow(settings: Record<string, string>): Promise<ExecuteResult> {
    const entries = Object.entries(settings)
    if (entries.length === 0) {
      return { rowsAffected: 0, lastInsertId: 0, error: null }
    }

    const placeholders = entries.map(() => '(?, ?)').join(', ')
    const values = entries.flat()

    const result = await database.value!.execute(
      `INSERT INTO ${DB_TABLES.APP_SETTINGS} (key, value) VALUES ${placeholders} ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      values
    )
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId,
      error: null
    }
  }

  async function saveAppSettings(settings: Record<string, string>): Promise<ExecuteResult> {
    try {
      return await saveAppSettingsOrThrow(settings)
    } catch (e) {
      console.error('Error saving app settings:', e)
      return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
    }
  }

  return {
    saveAppSetting,
    saveAppSettingOrThrow,
    saveAppSettings,
    saveAppSettingsOrThrow
  }
}
