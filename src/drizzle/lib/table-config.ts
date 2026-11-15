import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { getTableConfig } from 'drizzle-orm/sqlite-core'

/** Restricción `unique` unificada (declarada en columna o en tabla). */
export interface TableUniqueConstraint {
	/** Nombre real de la restricción; `undefined` si `.unique()` se declaró sin nombre. */
	name: string | undefined
	columns: string[]
}

/**
 * Columnas que forman la clave primaria, sea cual sea la forma de declararla.
 *
 * Drizzle guarda la PK en dos sitios según cómo se declare:
 *
 * - `integer().primaryKey()` → `columns[].primary === true` (obligatorio para `AUTOINCREMENT`).
 * - `primaryKey({ columns: [...] })` → `primaryKeys[]`.
 *
 * `getTableConfig().primaryKeys` solo devuelve la segunda forma, así que hay que
 * unir ambas para no perder la PK de tablas como `hosts`, `variables` o `passkeys`.
 */
export function getPrimaryKeyColumns(table: SQLiteTable): string[] {
	const { columns, primaryKeys } = getTableConfig(table)

	return [
		...new Set([
			...columns.filter(column => column.primary).map(column => column.name),
			...primaryKeys.flatMap(pk => pk.columns.map(column => column.name)),
		]),
	]
}

/**
 * Columna de la clave primaria, en cualquiera de las dos formas de declararla.
 *
 * Devuelve el objeto columna (no solo el nombre) para poder usarlo con `eq()`,
 * `eq(...)` o como clave de un `select`.
 */
export function getPrimaryKeyColumn(table: SQLiteTable): SQLiteColumn | undefined {
	const { columns, primaryKeys } = getTableConfig(table)

	return columns.find(column => column.primary) ?? primaryKeys[0]?.columns[0]
}

/**
 * Restricciones `unique` de la tabla, unificando las dos formas de declararlas.
 *
 * - `.unique('nombre')` en la columna → `columns[].isUnique` + `columns[].uniqueName`.
 * - `unique('nombre').on(...)` en la tabla → `uniqueConstraints[]`.
 *
 * `getTableConfig().uniqueConstraints` solo devuelve la segunda forma, por lo que
 * en este proyecto (todos los `unique` son de columna) siempre estaría vacío.
 */
export function getUniqueConstraints(table: SQLiteTable): TableUniqueConstraint[] {
	const { columns, uniqueConstraints } = getTableConfig(table)

	return [
		...columns
			.filter(column => column.isUnique)
			.map(column => ({ name: column.uniqueName, columns: [column.name] })),
		...uniqueConstraints.map(unique => ({ name: unique.name, columns: unique.columns.map(column => column.name) })),
	]
}

/**
 * Resumen de las dos restricciones que `getTableConfig` no unifica por sí solo:
 * clave primaria y `unique`.
 *
 * Los índices (`indexes`) y las claves foráneas (`foreignKeys`) ya vienen
 * unificados en `getTableConfig` y no necesitan helper.
 */
export function getTableConstraints(table: SQLiteTable): {
	primaryKey: string[]
	unique: TableUniqueConstraint[]
} {
	return {
		primaryKey: getPrimaryKeyColumns(table),
		unique: getUniqueConstraints(table),
	}
}
