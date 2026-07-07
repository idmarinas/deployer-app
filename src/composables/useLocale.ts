/**
 * useLocale.ts
 *
 * Composable para gestionar el idioma activo con carga lazy.
 * Registra mensajes y formatos en vue-i18n solo cuando se necesitan,
 * evitando cargar todos los idiomas al arrancar la aplicación.
 *
 * Uso:
 *   const { locale, setLocale, isLoading, availableLocales } = useLocale()
 *   await setLocale('en')
 */

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadLocaleMessages, loadDatetimeFormat, loadNumberFormat, availableLocales } from '../locales/_loader'

// Estado compartido entre todas las instancias del composable
const loadedLocales = new Set<string>()

// Tiempo mínimo de transición en ms
const MIN_TRANSITION_MS = 1000

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function useLocale() {
    const { locale, setLocaleMessage, setDateTimeFormat, setNumberFormat } = useI18n({ useScope: 'global' })
    const isLoading = ref(false)

    async function setLocale(newLocale: string): Promise<void> {
        if (locale.value === newLocale && loadedLocales.has(newLocale)) return

        isLoading.value = true

        try {
            // Carga de mensajes y delay mínimo en paralelo
            const [messages, datetimeFormat, numberFormat] = await Promise.all([
                loadedLocales.has(newLocale) ? Promise.resolve(null) : loadLocaleMessages(newLocale),
                loadedLocales.has(newLocale) ? Promise.resolve(null) : loadDatetimeFormat(newLocale),
                loadedLocales.has(newLocale) ? Promise.resolve(null) : loadNumberFormat(newLocale),
                sleep(MIN_TRANSITION_MS),
            ])

            if (!loadedLocales.has(newLocale)) {
                setLocaleMessage(newLocale, messages! as any)

                if (datetimeFormat) setDateTimeFormat(newLocale, datetimeFormat)
                if (numberFormat) setNumberFormat(newLocale, numberFormat)

                loadedLocales.add(newLocale)

                if (import.meta.env.DEV) {
                    console.info(`[i18n] Idioma "${newLocale}" cargado.`)
                }
            }

            locale.value = newLocale
        } catch (error) {
            console.error(`[i18n] Error cargando el idioma "${newLocale}":`, error)
        } finally {
            isLoading.value = false
        }
    }

    return {
        locale,
        setLocale,
        isLoading,
        availableLocales,
    }
}
