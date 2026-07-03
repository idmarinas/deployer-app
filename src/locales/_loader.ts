/**
 * _loader.ts
 *
 * Carga dinámicamente todos los módulos de traducción de una carpeta de idioma.
 * Utiliza import.meta.glob para que Vite agrupe los módulos en tiempo de compilación.
 *
 * Al añadir un nuevo idioma (ej: fr):
 *   1. Añadir sus entradas en LOCALE_GLOBS, DATETIME_GLOBS y NUMBER_GLOBS.
 *   2. Crear src/locales/fr.ts copiando es.ts y cambiando 'es' por 'fr'.
 *   3. Crear src/locales/fr/ con las traducciones.
 */

import type { IntlDateTimeFormat, IntlNumberFormat, LocaleMessages, VueMessageType } from 'vue-i18n'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type LocaleModule = { default: unknown }
type GlobModules = Record<string, () => Promise<LocaleModule>>
type FormatModule<T> = { default: T }

// ---------------------------------------------------------------------------
// Globs de mensajes — patrón negativo para excluir la carpeta formats/
// Vite soporta array de patrones: el primero incluye, los siguientes con '!' excluyen
// ---------------------------------------------------------------------------
const LOCALE_GLOBS: Record<string, GlobModules> = {
    es: import.meta.glob<LocaleModule>(['./es/**/*.ts', '!./es/formats/**']),
    en: import.meta.glob<LocaleModule>(['./en/**/*.ts', '!./en/formats/**']),
}


// ---------------------------------------------------------------------------
// Globs de formats — imports directos, uno por idioma
// ---------------------------------------------------------------------------
const DATETIME_GLOBS: Record<string, () => Promise<FormatModule<IntlDateTimeFormat>>> = {
    es: () => import('./es/formats/datetime.format'),
    en: () => import('./en/formats/datetime.format'),
}

const NUMBER_GLOBS: Record<string, () => Promise<FormatModule<IntlNumberFormat>>> = {
    es: () => import('./es/formats/number.format'),
    en: () => import('./en/formats/number.format'),
}

// ---------------------------------------------------------------------------
// Referencia: claves del idioma principal (es) para detectar ausencias
// ---------------------------------------------------------------------------
let referenceKeys: string[] | null = null

function getPathKeys(modules: GlobModules): string[] {
    return Object.keys(modules).map(normalizeKey)
}

/** './es/pages/setup.ts' → 'pages/setup' */
function normalizeKey(path: string): string {
    return path
        .replace(/^\.\/[a-z]{2}\//, '')
        .replace(/\.ts$/, '')
}

// ---------------------------------------------------------------------------
// Ensamblado: './es/pages/setup.ts' → { pages: { setup: <contenido> } }
// ---------------------------------------------------------------------------
function setDeep(obj: Record<string, unknown>, parts: string[], value: unknown): void {
    const key = parts[0]
    if (parts.length === 1) {
        if (typeof obj[key] === 'object' && obj[key] !== null && typeof value === 'object' && value !== null) {
            Object.assign(obj[key], value)
        } else if (typeof value === 'object' && value !== null) {
            obj[key] = { ...value }
        } else {
            obj[key] = value
        }
        return
    }
    if (!obj[key] || typeof obj[key] !== 'object') {
        obj[key] = {}
    }
    setDeep(obj[key] as Record<string, unknown>, parts.slice(1), value)
}

function buildLocaleObject(resolvedModules: Record<string, unknown>): LocaleMessages<VueMessageType> {
    const result: Record<string, unknown> = {}

    for (const [path, value] of Object.entries(resolvedModules)) {
        const key = normalizeKey(path)

        if (key.endsWith('/index') || key === 'index') {
            const parentParts = key.replace(/\/index$/, '').split('/')
            setDeep(result, parentParts, value)
        } else {
            setDeep(result, key.split('/'), value)
        }
    }

    return result as LocaleMessages<VueMessageType>
}

// ---------------------------------------------------------------------------
// Dev: avisar de claves presentes en 'es' pero ausentes en otro idioma
// ---------------------------------------------------------------------------
function warnMissingKeys(locale: string, modules: GlobModules): void {
    if (!import.meta.env.DEV || !referenceKeys) return

    const missing = referenceKeys.filter(k => !getPathKeys(modules).includes(k))

    if (missing.length > 0) {
        console.warn(
            `[i18n] ⚠️  Idioma "${locale}" — faltan ${missing.length} archivo(s) respecto al idioma principal (es):\n` +
            missing.map(k => `  • ${locale}/${k}.ts`).join('\n')
        )
    }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Carga los mensajes de traducción de un idioma. */
export async function loadLocaleMessages(locale: string): Promise<LocaleMessages<VueMessageType>> {
    const globModules = LOCALE_GLOBS[locale]

    if (!globModules) {
        console.error(`[i18n] Idioma "${locale}" no encontrado en LOCALE_GLOBS de _loader.ts.`)
        return {}
    }

    if (locale !== 'es' && referenceKeys === null) {
        referenceKeys = getPathKeys(LOCALE_GLOBS['es'] ?? {})
    }

    if (locale !== 'es') {
        warnMissingKeys(locale, globModules)
    }

    const resolvedEntries = await Promise.all(
        Object.entries(globModules).map(async ([path, importer]) => {
            const mod = await importer()
            return [path, mod.default] as [string, unknown]
        })
    )

    return buildLocaleObject(Object.fromEntries(resolvedEntries))
}

/** Carga el formato de fechas de un idioma. */
export async function loadDatetimeFormat(locale: string): Promise<IntlDateTimeFormat | null> {
    const importer = DATETIME_GLOBS[locale]
    if (!importer) return null
    const mod = await importer()
    return mod.default
}

/** Carga el formato de números de un idioma. */
export async function loadNumberFormat(locale: string): Promise<IntlNumberFormat | null> {
    const importer = NUMBER_GLOBS[locale]
    if (!importer) return null
    const mod = await importer()
    return mod.default
}

/** Lista de idiomas disponibles (derivada de LOCALE_GLOBS). */
export const availableLocales = Object.keys(LOCALE_GLOBS)
