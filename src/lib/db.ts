import { invoke } from '@tauri-apps/api/core'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import * as relationsSchema from './relations'
import * as tablesSchema from './schema'

const schema = { ...tablesSchema, ...relationsSchema }

/**
 * Proxy Drizzle → Tauri `query_raw`.
 *
 * Drizzle genera el SQL en el frontend y lo delega al comando Rust `query_raw`,
 * que lo ejecuta sobre el SQLite local del usuario.
 *
 * Se pasa el schema completo (tablas + relaciones de relations.ts) para poder usar
 * el Relational Queries API: `db.query.projects.findFirst({ with: { hosts: true } })`.
 * Esto evita el problema de productos cartesianos al combinar varios leftJoin 1:N
 * manuales — Drizzle separa las queries y anida los resultados correctamente.
 *
 * `query_raw` devuelve un CommandResponse: { success, data, message_key, message_params }.
 * `data` es un array de filas, cada fila un array de valores en el orden de columnas
 * del SELECT (no un objeto), que es justo lo que el modo proxy de Drizzle espera.
 */
interface QueryRawResponse {
	success: boolean
	data: unknown[][] | null
	message_key?: string
	message_params?: Record<string, string>
}

export const db = drizzle<typeof schema>(
	async (sql, params, method) => {
		const response = await invoke<QueryRawResponse>('query_raw', {
			sql,
			params: params ?? [],
		})

		if (!response.success) {
			throw new Error(response.message_key ?? 'query_raw failed')
		}

		const rows = response.data ?? []

		if (method === 'get') {
			return { rows: rows[0] ?? [] }
		}

		return { rows }
	},
	{ schema },
)
