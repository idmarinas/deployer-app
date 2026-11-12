import type { Command } from '@/types/entities'

import { desc } from 'drizzle-orm'

import { createCrudQuery } from '@/composables/queries/crud'
import { commands as deployer_commands } from '@/drizzle/schema'

/**
 * CRUD de comandos.
 *
 * Usa soft-delete como el resto de entidades: `remove` marca `deleted_at` y
 * `restore` lo vuelve a `NULL`. `findAll()` excluye por defecto las filas
 * eliminadas; para la papelera se llama `findAll({ onlyDeleted: true })`.
 * El listado se ordena por `created_at` descendente.
 */
export function useCommandQuery() {
	return createCrudQuery<
		typeof deployer_commands,
		string,
		Omit<Command, 'created_at' | 'updated_at' | 'deleted_at'>,
		Partial<Omit<Command, 'key' | 'created_at'>>
	>({
		table: deployer_commands,
		primaryKey: deployer_commands.key,
		cacheKey: 'commands',
		i18nPrefix: 'notifications.commands',
		nameOf: row => row.name,
		listOrderBy: [desc(deployer_commands.created_at)],
		softDelete: {
			deletedAt: deployer_commands.deleted_at,
			updatedAt: deployer_commands.updated_at,
		},
	})
}
