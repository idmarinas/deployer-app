import { invoke } from '@tauri-apps/api/core'
import type { CommandResponse } from '@/types/tauri-types'

export interface SaveDeployerSettingsResult {
	error: string | null
}

export function useDeployerSettingsQuery() {
	/**
	 * Guarda (upsert) un único ajuste. Internamente delega en el mismo
	 * comando de Rust que `saveDeployerSettings`, pasando un objeto de 1 clave.
	 */
	async function saveDeployerSettingOrThrow(key: string, value: string): Promise<SaveDeployerSettingsResult> {
		return saveDeployerSettingsOrThrow({ [key]: value })
	}

	async function saveDeployerSetting(key: string, value: string): Promise<SaveDeployerSettingsResult> {
		try {
			return await saveDeployerSettingOrThrow(key, value)
		} catch (e) {
			console.error('Error saving deployer setting:', e)
			return { error: String(e) }
		}
	}

	/**
	 * Guarda (upsert) uno o varios ajustes en una única transacción en Rust.
	 * Admite tanto un solo ajuste como varios, sin distinción.
	 */
	async function saveDeployerSettingsOrThrow(settings: Record<string, string>): Promise<SaveDeployerSettingsResult> {
		const response = await invoke<CommandResponse>('set_deployer_settings', { settings })

		if (!response.success) {
			throw new Error(response.message_key)
		}

		return { error: null }
	}

	async function saveDeployerSettings(settings: Record<string, string>): Promise<SaveDeployerSettingsResult> {
		try {
			return await saveDeployerSettingsOrThrow(settings)
		} catch (e) {
			console.error('Error saving deployer settings:', e)
			return { error: String(e) }
		}
	}

	return {
		saveDeployerSetting,
		saveDeployerSettingOrThrow,
		saveDeployerSettings,
		saveDeployerSettingsOrThrow,
	}
}
