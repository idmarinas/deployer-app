/**
 * Escáner de usos de variables globales en texto interpolable.
 *
 * Las expresiones `{{global.<slug>}}` viven dentro de `deployer_commands.command`
 * y no son claves foráneas: SQLite no puede bloquear el borrado de una variable
 * referenciada. Este módulo devuelve las entidades que la usan para que la UI
 * pueda avisar antes de borrarla.
 *
 * Solo se recorren las filas activas (`deleted_at IS NULL`): las que están en
 * papelera no se ejecutan y no deben bloquear el aviso.
 */

import { commands as deployer_commands } from '@/drizzle/schema'
import { db } from '@/drizzle/drizzle'
import { isNull } from 'drizzle-orm'

import { findReferences } from './resolver'

export interface VariableUsage {
	/** Entidad que contiene la expresión (crecerá con workflows). */
	entity: 'command'
	/** Clave de la fila usuaria (p. ej. `deployer_commands.key`). */
	key: string
	/** Nombre legible para el diálogo. */
	name: string
	/** Expresiones encontradas, p. ej. `{{global.deploy_app}}`. */
	expressions: string[]
}

/**
 * Devuelve las entidades activas que referencian `slug` con `{{global.<slug>}}`.
 *
 * No lanza: si la lectura falla devuelve una lista vacía (el aviso es
 * informativo, no debe impedir la operación).
 */
export async function findVariableUsages(slug: string): Promise<VariableUsage[]> {
	const target = `global.${slug}`

	try {
		const rows = await db
			.select({
				key: deployer_commands.key,
				name: deployer_commands.name,
				command: deployer_commands.command,
			})
			.from(deployer_commands)
			.where(isNull(deployer_commands.deleted_at))

		const usages: VariableUsage[] = []

		for (const row of rows) {
			const expressions = findReferences(row.command)
				.filter(reference => reference.scope === 'global' && reference.segments.join('.') === target)
				.map(reference => reference.expression)

			if (expressions.length === 0) continue

			usages.push({
				entity: 'command',
				key: row.key,
				name: row.name,
				expressions: [...new Set(expressions)],
			})
		}

		return usages
	} catch {
		return []
	}
}
