import { createI18n } from 'vue-i18n'

import { availableLocales, loadDatetimeFormat, loadLocaleMessages, loadNumberFormat } from './locales/_loader'

const DEFAULT_LOCALE = navigator.language.split('-')[0] // "es-ES" → "es"

// Carga inicial: solo el idioma por defecto
const [messages, datetimeFormat, numberFormat] = await Promise.all([
	loadLocaleMessages(DEFAULT_LOCALE),
	loadDatetimeFormat(DEFAULT_LOCALE),
	loadNumberFormat(DEFAULT_LOCALE),
])

/**
 * Instancia global de vue-i18n.
 *
 * Exportada para poder usar `i18n.global.t` fuera de componentes
 * (composables de query, loaders de Pinia Colada, funciones `query`
 * que se ejecutan vía `invalidateQueries` sin contexto de setup).
 */
export const i18n = createI18n({
	escapeParameter: true,
	legacy: false,
	locale: DEFAULT_LOCALE,
	fallbackLocale: DEFAULT_LOCALE,
	availableLocales,
	messages: {
		[DEFAULT_LOCALE]: messages,
	} as any,
	datetimeFormats: {
		[DEFAULT_LOCALE]: datetimeFormat ?? {},
	},
	numberFormats: {
		[DEFAULT_LOCALE]: numberFormat ?? {},
	},
})
