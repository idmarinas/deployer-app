import { useCommandQuery } from '@/composables/queries/commands'
import { useHostQuery } from '@/composables/queries/hosts'
import { usePasskeyQuery } from '@/composables/queries/passkeys'
import { useVariableQuery } from '@/composables/queries/variables'
import { ModulesName } from '@/utils/deployer-app'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

/**
 * Loaders de la papelera.
 *
 * Las claves empiezan por el `cacheKey` de la entidad, así que
 * `invalidateCacheQueries(cacheQuery, [cacheKey])` refresca también la papelera
 * tras restaurar, purgar o vaciar.
 */
export const useVariablesTrash = defineColadaLoader({
	key: ['variables', 'trash'],
	query: async () => await useVariableQuery().findAll({ onlyDeleted: true }),
})

export const useHostsTrash = defineColadaLoader({
	key: ['hosts', 'trash'],
	query: async () => await useHostQuery().findAll({ onlyDeleted: true }),
})

export const useCommandsTrash = defineColadaLoader({
	key: ['commands', 'trash'],
	query: async () => await useCommandQuery().findAll({ onlyDeleted: true }),
})

export const usePasskeysTrash = defineColadaLoader({
	key: ['passkeys', 'trash'],
	query: async () => await usePasskeyQuery().findAll({ onlyDeleted: true }),
})

/** Devuelve el loader de papelera correspondiente al módulo. */
export function useTrashLoader(module: ModulesName) {
	switch (module) {
		case ModulesName.Variables:
			return useVariablesTrash()
		case ModulesName.Hosts:
			return useHostsTrash()
		case ModulesName.Commands:
			return useCommandsTrash()
		case ModulesName.Passkeys:
			return usePasskeysTrash()
		default:
			return useVariablesTrash()
	}
}
