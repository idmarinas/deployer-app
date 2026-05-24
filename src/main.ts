import './assets/css/main.css'


import type { CommandResponse } from './types/tauri-types'
import type { RouteRecordRaw } from 'vue-router'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@unhead/vue/client'
import { createI18n } from 'vue-i18n'
import ui from '@nuxt/ui/vue-plugin'

// Tauri related
import { invoke } from '@tauri-apps/api/core'

import { loadLocaleMessages, loadDatetimeFormat, loadNumberFormat, availableLocales } from './locales/_loader'

import App from './App.vue'

const DEFAULT_LOCALE = navigator.language.split('-')[0]; // "es-ES" → "es"

// Carga inicial: solo el idioma por defecto
const [messages, datetimeFormat, numberFormat] = await Promise.all([
    loadLocaleMessages(DEFAULT_LOCALE),
    loadDatetimeFormat(DEFAULT_LOCALE),
    loadNumberFormat(DEFAULT_LOCALE),
])

const router = createRouter({
    routes: setupLayouts(routes as RouteRecordRaw[]),
    history: createWebHistory()
})

const i18n = createI18n({
    legacy: false,
    locale: DEFAULT_LOCALE,
    fallbackLocale: DEFAULT_LOCALE,
    availableLocales,
    messages: {
        [DEFAULT_LOCALE]: messages,
    },
    datetimeFormats: {
        [DEFAULT_LOCALE]: datetimeFormat ?? {},
    },
    numberFormats: {
        [DEFAULT_LOCALE]: numberFormat ?? {},
    },
})

async function bootstrap() {
  // 1. Comprobaciones ANTES de montar Vue
  const exists = await invoke<CommandResponse<boolean>>('check_database_exists')

  if (exists.success && exists.data) {
    const hasPending = await invoke<CommandResponse<boolean>>('has_pending_migrations')

    if (hasPending.success && hasPending.data) {
      await router.push('/migrations')
    } else {
      await router.push('/')
    }
  } else {
    await invoke<CommandResponse>('set_database_path', { path: '' })
    await router.push('/setup')
  }

  // 2. Esperar a que el router esté listo
  await router.isReady()

  // 3. Ahora sí montas Vue
  createApp(App)
    .use(createHead())
    .use(i18n)
    .use(router)
    .use(ui)
    .mount("#app")
}

bootstrap()

// This will update routes at runtime without reloading the page
if (import.meta.hot) {
  handleHotUpdate(router)
}
