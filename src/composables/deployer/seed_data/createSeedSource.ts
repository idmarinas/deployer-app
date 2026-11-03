import type { SQL } from 'drizzle-orm'
import type { AnySQLiteColumn, AnySQLiteTable } from 'drizzle-orm/sqlite-core'
import type { ComposerTranslation } from 'vue-i18n'

import type { SeedKey, SeedRow, SeedSource, SeedSourceConfig, SeedUpsertOptions } from './types'

import { sql } from 'drizzle-orm'

import { db } from '@/drizzle/drizzle'

/** Devuelve la referencia `excluded.<columna>` usada en un upsert de SQLite. */
function excluded(column: string): SQL {
	return sql`excluded.${sql.identifier(column)}`
}

/** Accede a las columnas de una tabla por su nombre en tiempo de ejecución. */
function getColumns(table: AnySQLiteTable): Record<string, AnySQLiteColumn> {
	return table as unknown as Record<string, AnySQLiteColumn>
}

/**
 * Inserta las filas y, si la clave ya existe, actualiza las columnas indicadas.
 * Sin `options` las filas existentes se dejan intactas.
 */
async function upsert(
	table: AnySQLiteTable,
	rows: readonly SeedRow[],
	target: AnySQLiteColumn,
	options?: SeedUpsertOptions,
) {
	if (rows.length === 0) return

	const insert = db.insert(table).values(rows as never)

	if (!options) {
		await insert.onConflictDoNothing()
		return
	}

	const set = Object.fromEntries(options.columns.map(column => [column, excluded(column)]))

	await insert.onConflictDoUpdate({
		target,
		...(options.where ? { targetWhere: options.where } : {}),
		set: { ...set, ...options.values } as never,
	})
}

/**
 * Crea un origen de datos predeterminados reutilizable a partir de la tabla y
 * la configuración de columnas. La clave del registro puede ser `key` (texto) o
 * `id` (número), por lo que seed y reset no dependen de una tabla concreta.
 */
export function createSeedSource<TRecord extends object>(config: SeedSourceConfig<TRecord>): SeedSource {
	const columns = getColumns(config.table)
	const target = columns[config.idField]

	if (!target) {
		throw new Error(`[seed] La columna "${config.idField}" no existe en la tabla de "${config.id}"`)
	}

	const defaults = (t: ComposerTranslation) => config.defaults(t)
	const recordKey = (row: TRecord) => row[config.idField] as SeedKey
	const recordName = (row: TRecord) => String(row[config.nameField ?? config.idField] ?? recordKey(row))

	function pickRows(t: ComposerTranslation, keys?: readonly SeedKey[]): readonly TRecord[] {
		const rows = defaults(t)

		if (!keys || keys.length === 0) return rows

		const selected = new Set(keys)

		return rows.filter(row => selected.has(recordKey(row)))
	}

	return {
		id: config.id,
		file: config.file,
		icon: config.icon,
		label: config.label,
		cacheKey: config.cacheKey,
		records: t =>
			defaults(t).map(row => ({
				key: recordKey(row),
				name: recordName(row),
			})),
		async seed(t) {
			await upsert(
				config.table,
				defaults(t) as readonly SeedRow[],
				target,
				config.seedColumns
					? {
							columns: config.seedColumns,
							where: config.seedWhere,
						}
					: undefined,
			)
		},
		async reset(t, keys) {
			await upsert(config.table, pickRows(t, keys) as readonly SeedRow[], target, {
				columns: config.resetColumns,
				values: config.resetValues,
			})
		},
	}
}
