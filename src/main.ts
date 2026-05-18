import './assets/css/main.css'

import type { RouteRecordRaw } from 'vue-router'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@unhead/vue/client'
import { createI18n } from 'vue-i18n'
import ui from '@nuxt/ui/vue-plugin'

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

createApp(App)
    .use(createHead())
    .use(i18n)
    .use(router)
    .use(ui)
    .mount("#app")

// This will update routes at runtime without reloading the page
if (import.meta.hot) {
    handleHotUpdate(router)
}
