/**
 * Carga de variables globales (`deployer_variables`) para el motor de
 * interpolación.
 *
 * Hay dos modos:
 * - `loadGlobalScopeMetadata()`: metadatos para UI, linter y preview. Los
 *   valores secretos llegan enmascarados (`BLANK_VALUE`) por el proxy Drizzle.
 * - `loadGlobalScopeForExecution()`: igual, pero descifra las secretas
 *   habilitadas justo antes de ejecutar. El descifrado se hace por valor
 *   (lectura cruda puntual + `decrypt`) para no depender del flag global
 *   `withDecryption`, que no es seguro con operaciones asíncronas.
 */

import { invoke } from '@tauri-apps/api/core'
import { isNull } from 'drizzle-orm'

import { db } from '@/drizzle/drizzle'
import type { QueryRawResponse } from '@/drizzle/drizzle.interfaces'
import { decrypt, encryptScope } from '@/drizzle/lib/stronghold'
import { variables } from '@/drizzle/schema'
import { i18n } from '@/i18n'

/** Entrada del ámbito `global` tal como la consume el motor. */
export interface GlobalVariableScopeEntry {
	slug: string
	name: string
	value: string
	enabled: boolean
	isSecret: boolean
}

export type GlobalVariableScope = Record<string, GlobalVariableScopeEntry>

const VARIABLES_TABLE = 'deployer_variables'
const VALUE_FIELD = 'value'

/**
 * Lee las variables globales no eliminadas.
 *
 * Incluye deshabilitadas para que el motor pueda distinguir "no existe" de
 * "está deshabilitada". Los valores secretos quedan enmascarados.
 */
export async function loadGlobalScopeMetadata(): Promise<GlobalVariableScope> {
	const rows = await db
		.select({
			slug: variables.slug,
			name: variables.name,
			value: variables.value,
			enabled: variables.enabled,
			is_secret: variables.is_secret,
		})
		.from(variables)
		.where(isNull(variables.deleted_at))

	const scope: GlobalVariableScope = {}

	for (const row of rows) {
		scope[row.slug] = {
			slug: row.slug,
			name: row.name,
			value: row.value,
			enabled: row.enabled,
			isSecret: row.is_secret,
		}
	}

	return scope
}

/**
 * Lee los ciphertexts reales de las variables secretas indicadas.
 *
 * Usa `query_raw` directamente (sin pasar por el proxy) para obtener
 * `ENC:{version}:<base64>` en lugar de `BLANK_VALUE`.
 */
async function readSecretCiphertexts(slugs: string[]): Promise<Map<string, string>> {
	const result = new Map<string, string>()
	if (slugs.length === 0) return result

	const placeholders = slugs.map(() => '?').join(', ')
	const sql =
		`SELECT "slug", "${VALUE_FIELD}" FROM "${VARIABLES_TABLE}" ` +
		`WHERE "deleted_at" IS NULL AND "slug" IN (${placeholders})`

	const response = await invoke<QueryRawResponse>('query_raw', { sql, params: slugs })

	if (!response.success || !response.data) {
		throw new Error(i18n.global.t('utils.interpolation.errors.read_failed'))
	}

	const slugIndex = response.data.columns.indexOf('slug')
	const valueIndex = response.data.columns.indexOf(VALUE_FIELD)
	if (slugIndex < 0 || valueIndex < 0) return result

	for (const row of response.data.rows) {
		const slug = row[slugIndex]
		const ciphertext = row[valueIndex]

		if (typeof slug === 'string' && typeof ciphertext === 'string') {
			result.set(slug, ciphertext)
		}
	}

	return result
}

/**
 * Carga el ámbito `global` con los valores secretos descifrados.
 *
 * Solo debe llamarse justo antes de una ejecución (comando o consola). Los
 * valores descifrados no deben guardarse en caché ni mostrarse en la UI.
 */
export async function loadGlobalScopeForExecution(): Promise<GlobalVariableScope> {
	const scope = await loadGlobalScopeMetadata()

	const secretEntries = Object.values(scope).filter(entry => entry.isSecret && entry.enabled)
	if (secretEntries.length === 0) return scope

	const ciphertexts = await readSecretCiphertexts(secretEntries.map(entry => entry.slug))
	const encryptionScope = encryptScope(VARIABLES_TABLE, VALUE_FIELD)

	for (const entry of secretEntries) {
		const ciphertext = ciphertexts.get(entry.slug)
		if (!ciphertext) {
			// Una variable secreta sin valor cifrado (p. ej. cadena vacía) se
			// resuelve como vacía, nunca con el marcador de enmascarado.
			entry.value = ''
			continue
		}

		try {
			entry.value = await decrypt(encryptionScope, ciphertext)
		} catch {
			throw new Error(
				i18n.global.t('utils.interpolation.errors.decrypt_failed', { path: `global.${entry.slug}` }),
			)
		}
	}

	return scope
}
