import './assets/css/main.css'

import type { CommandResponse } from './types/tauri-types'

import ui from '@nuxt/ui/vue-plugin'
import { PiniaColada } from '@pinia/colada'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import { DataLoaderPlugin } from 'vue-router/experimental'

// Tauri related
import { invoke } from '@tauri-apps/api/core'

import App from './App.vue'
import { i18n } from './i18n'
import { checkVaultHealth } from './drizzle/lib/stronghold'

const router = createRouter({
	routes,
	history: createWebHistory(),
})

async function bootstrap() {
	// 0. Diagnóstico del vault de Stronghold (no bloqueante)
	try {
		const health = await checkVaultHealth()
		if (!health.vault_file_exists) {
			console.warn('[stronghold] Vault no encontrado. Se inicializará en el primer cifrado.')
		} else if (!health.client_exists || health.missing_scopes.length > 0) {
			console.warn(
				`[stronghold] Vault incompleto. Claves faltantes: ${health.missing_scopes.join(', ') || 'client no encontrado'}`,
			)
		}
	} catch (err) {
		console.warn('[stronghold] No se pudo verificar la salud del vault:', err)
	}

	// 1. Comprobaciones ANTES de montar Vue
	const exists = await invoke<CommandResponse<boolean>>('check_database_exists')

	if (exists.success && exists.data) {
		const hasPending = await invoke<CommandResponse<boolean>>('has_migrations_pending')

		if (hasPending.success && hasPending.data) {
			await router.push('/deployer/migrations')
		} else {
			await router.push('/dashboard')
		}
	} else {
		await invoke<CommandResponse>('set_database_path', { path: '' })
		await router.push('/deployer')
	}

	// 2. Esperar a que el router esté listo
	await router.isReady()

	// 3. Ahora sí montas Vue
	createApp(App)
		.use(createHead())
		.use(i18n)
		.use(createPinia())
		.use(PiniaColada)
		.use(DataLoaderPlugin, { router })
		.use(router)
		.use(ui)
		.mount('#app')
}

bootstrap()

// This will update routes at runtime without reloading the page
if (import.meta.hot) {
	handleHotUpdate(router)
}
