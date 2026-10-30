import type { CommandResponse } from '@/types/tauri-types'
import type { StepperItem } from '@nuxt/ui'

import { invoke } from '@tauri-apps/api/core'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

import { setAppSettings } from '@/composables/deployer/useAppSettings'
import { ICONS } from '@/utils/icons'
import { useAppSeed } from './useAppSeed'

export type StepStatus = 'idle' | 'loading' | 'success' | 'error'

export interface StepItem extends Omit<StepperItem, 'key'> {
	id: string
	status: StepStatus
	invoke: string | Function
}

export function appConfigureSteps() {
	const { locale, t } = useI18n()
	const colorMode = useColorMode()

	// Pasos para crear el archivo de Base de Datos
	const createSteps = (path: string | null): StepItem[] => [
		{
			id: 'create_file',
			icon: 'i-tabler-file-database',
			title: t('steps.setup.title.create_file'),
			description: t('steps.setup.description.idle.create_file'),
			status: 'idle',
			invoke: 'create_database_file',
		},
		{
			id: 'initialize',
			icon: 'i-tabler-database-plus',
			title: t('steps.setup.title.initialize'),
			description: t('steps.setup.description.idle.initialize'),
			status: 'idle',
			invoke: 'initialize_database',
		},
		{
			id: 'migrations',
			icon: ICONS.database.databaseImport,
			title: t('steps.setup.title.migrations'),
			description: t('steps.setup.description.idle.migrations'),
			status: 'idle',
			invoke: 'execute_migrations',
		},
		{
			id: 'validate',
			icon: 'i-tabler-database-smile',
			title: t('steps.setup.title.validate'),
			description: t('steps.setup.description.idle.validate'),
			status: 'idle',
			invoke: 'validate_database_sqlite',
		},
		{
			id: 'save_path',
			icon: 'i-tabler-database-search',
			title: t('steps.setup.title.save_path'),
			description: t('steps.setup.description.idle.save_path'),
			status: 'idle',
			async invoke() {
				try {
					await invoke<CommandResponse>('set_database_path', { path })

					return {
						success: true,
					}
				} catch {
					return {
						success: false,
						message_key: 'pages.app.setup.toast.error.save_path',
						message_params: {},
					}
				}
			},
		},
		{
			id: 'seed',
			icon: 'i-tabler-database-import',
			title: t('steps.setup.title.seed'),
			description: t('steps.setup.description.idle.seed'),
			status: 'idle',
			async invoke(): Promise<CommandResponse> {
				try {
					const { execute } = useAppSeed()

					await setAppSettings([
						{ key: 'locale', value: locale.value },
						{ key: 'theme_color', value: colorMode.value },
					])

					await execute()

					return {
						success: true,
						data: null,
						message_key: 'tauri.deployer_settings.success.saved',
						message_params: {},
					}
				} catch (e) {
					return {
						success: false,
						data: null,
						message_key: 'tauri.deployer_settings.errors.save_failed',
						message_params: { reason: String(e) },
					}
				}
			},
		},
	]

	// Pasos para cargar el archivo de una Base de Datos
	const loadSteps = (path: string | null): StepItem[] => [
		{
			id: 'validate_pre',
			icon: 'i-tabler-database-smile',
			title: t('steps.setup.title.validate'),
			description: t('steps.setup.description.idle.validate'),
			status: 'idle',
			invoke: 'validate_database_sqlite',
		},
		{
			id: 'migrations',
			icon: ICONS.database.databaseCog,
			title: t('steps.setup.title.migrations'),
			description: t('steps.setup.description.idle.migrations'),
			status: 'idle',
			invoke: 'execute_migrations',
		},
		{
			id: 'validate_post',
			icon: 'i-tabler-database-smile',
			title: t('steps.setup.title.validate'),
			description: t('steps.setup.description.idle.validate'),
			status: 'idle',
			invoke: 'validate_database_sqlite',
		},
		{
			id: 'save_path',
			icon: ICONS.database.databaseImport,
			title: t('steps.setup.title.save_path'),
			description: t('steps.setup.description.idle.save_path'),
			status: 'idle',
			async invoke() {
				try {
					await invoke<CommandResponse>('set_database_path', { path })

					return {
						success: true,
					}
				} catch {
					return {
						success: false,
						message_key: 'pages.app.setup.toast.error.save_path',
						message_params: {},
					}
				}
			},
		},
		{
			id: 'seed',
			icon: 'i-tabler-database-import',
			title: t('steps.setup.title.seed'),
			description: t('steps.setup.description.idle.seed'),
			status: 'idle',
			async invoke(): Promise<CommandResponse> {
				try {
					const { execute } = useAppSeed()

					await execute()

					return {
						success: true,
						data: null,
						message_key: 'tauri.deployer_settings.success.saved',
						message_params: {},
					}
				} catch (e) {
					return {
						success: false,
						data: null,
						message_key: 'tauri.deployer_settings.errors.save_failed',
						message_params: { reason: String(e) },
					}
				}
			},
		},
	]

	// Pasos para la migración de la Base de Datos
	const migrationSteps = (): StepItem[] => [
		{
			id: 'migrations',
			icon: 'i-tabler-database',
			title: t('steps.setup.title.migrations'),
			description: t('steps.setup.description.idle.migrations'),
			status: 'idle',
			invoke: 'execute_migrations',
		},
		{
			id: 'validate',
			icon: 'i-tabler-database-smile',
			title: t('steps.setup.title.validate'),
			description: t('steps.setup.description.idle.validate'),
			status: 'idle',
			invoke: 'validate_database_sqlite',
		},
		{
			id: 'seed',
			icon: 'i-tabler-database-import',
			title: t('steps.setup.title.seed'),
			description: t('steps.setup.description.idle.seed'),
			status: 'idle',
			async invoke(): Promise<CommandResponse> {
				try {
					const { execute } = useAppSeed()

					await execute()

					return {
						success: true,
						data: null,
						message_key: 'tauri.deployer_settings.success.saved',
						message_params: {},
					}
				} catch (e) {
					return {
						success: false,
						data: null,
						message_key: 'tauri.deployer_settings.errors.save_failed',
						message_params: { reason: String(e) },
					}
				}
			},
		},
	]

	return {
		createSteps,
		loadSteps,
		migrationSteps,
	}
}
