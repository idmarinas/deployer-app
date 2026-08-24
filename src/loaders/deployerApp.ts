import type { AppInfo, CommandResponse, DatabaseInfo, MigrationInfo } from '@/types/tauri-types'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

import useToaster from '@/composables/useToaster'
import { i18n } from '@/i18n'
import { invoke } from '@tauri-apps/api/core'

export const useDeployerAppMigrations = defineColadaLoader('dashboard-app', {
	key: ['app', 'config', 'migrations'],
	query: async () => {
		const { t } = i18n.global
		const toaster = useToaster()

		return await invoke<CommandResponse<MigrationInfo[]>>('get_migrations_info')
			.then(response => {
				if (response.success) {
					return response.data || []
				} else {
					toaster.error(t(response.message_key, response.message_params))

					return [] as MigrationInfo[]
				}
			})
			.catch(e => {
				toaster.error(t('overlays.toast.title.error', String(e)))

				return [] as MigrationInfo[]
			})
	},
})

const appInfoDefault: AppInfo = {
	name: '',
	version: '',
	identifier: '',
	publisher: '',
	copyright: '',
	tauri_version: '',
	platform: '',
	architecture: '',
	vue_version: '',
	nuxt_ui_version: '',
}

export const useDeployerAppInfo = defineColadaLoader('dashboard-app', {
	key: ['app', 'config', 'app-info'],
	query: async () => {
		const { t } = i18n.global
		const toaster = useToaster()

		return await invoke<CommandResponse<AppInfo>>('get_app_info')
			.then(response => {
				if (response.success) {
					return response.data || appInfoDefault
				} else {
					toaster.error(t(response.message_key, response.message_params))

					return appInfoDefault
				}
			})
			.catch(e => {
				toaster.error(t('overlays.toast.title.error', String(e)))

				return appInfoDefault
			})
	},
})

const databaseInfoDefault: DatabaseInfo = {
	path: '',
	file_size_bytes: 0,
	table_count: 0,
	tables: [],
	other_tables: null,
	page_count: 0,
	page_size: 0,
}

export const useDeployerAppDatabaseInfo = defineColadaLoader('dashboard-app', {
	key: ['app', 'config', 'database-info', 'app-db'],
	query: async () => {
		const { t } = i18n.global
		const toaster = useToaster()

		return await invoke<CommandResponse<DatabaseInfo>>('get_database_info')
			.then(response => {
				if (response.success) {
					return response.data || databaseInfoDefault
				} else {
					toaster.error(t(response.message_key, response.message_params))

					return databaseInfoDefault
				}
			})
			.catch(e => {
				toaster.error(t('overlays.toast.title.error', String(e)))

				return databaseInfoDefault
			})
	},
})
