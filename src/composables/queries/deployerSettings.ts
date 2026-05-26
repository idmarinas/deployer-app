import { type ExecuteResult, useDatabase } from '@/composables/useDatabase'
import { DB_TABLES } from '@/constants/dbTables'

export function useDeployerSettingsQuery() {
  const { db: database } = useDatabase()

  async function saveDeployerSettingOrThrow(key: string, value: string): Promise<ExecuteResult> {
    const result = await database.value!.execute(
      `INSERT INTO ${DB_TABLES.DEPLOYER_SETTINGS} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId,
      error: null
    }
  }

  async function saveDeployerSetting(key: string, value: string): Promise<ExecuteResult> {
    try {
      return await saveDeployerSettingOrThrow(key, value)
    } catch (e) {
      console.error('Error saving deployer setting:', e)
      return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
    }
  }

  async function saveDeployerSettingsOrThrow(settings: Record<string, string>): Promise<ExecuteResult> {
    const entries = Object.entries(settings)
    if (entries.length === 0) {
      return { rowsAffected: 0, lastInsertId: 0, error: null }
    }

    const placeholders = entries.map(() => '(?, ?)').join(', ')
    const values = entries.flat()

    const result = await database.value!.execute(
      `INSERT INTO ${DB_TABLES.DEPLOYER_SETTINGS} (key, value) VALUES ${placeholders} ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      values
    )
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId,
      error: null
    }
  }

  async function saveDeployerSettings(settings: Record<string, string>): Promise<ExecuteResult> {
    try {
      return await saveDeployerSettingsOrThrow(settings)
    } catch (e) {
      console.error('Error saving deployer settings:', e)
      return { rowsAffected: 0, lastInsertId: 0, error: String(e) }
    }
  }

  return {
    saveDeployerSetting,
    saveDeployerSettingOrThrow,
    saveDeployerSettings,
    saveDeployerSettingsOrThrow
  }
}
