import type { CrudApi } from '@/composables/queries/shared.interfaces'

import { useCommandQuery } from '@/composables/queries/commands'
import { useHostQuery } from '@/composables/queries/hosts'
import { usePasskeyQuery } from '@/composables/queries/passkeys'
import { useVariableQuery } from '@/composables/queries/variables'
import { ModulesName } from '@/utils/deployer-app'

export type CrudIdField = 'id' | 'key'

export interface CrudModuleApi {
	/** API CRUD de la entidad. Se tipa como `any` porque cada módulo usa una tabla distinta. */
	api: CrudApi<any, any, any, any>
	/** Campo que identifica la fila. */
	idField: CrudIdField
}

/** Devuelve el CRUD y el campo identificador del módulo. */
export function useCrudByModule(module: ModulesName): CrudModuleApi {
	switch (module) {
		case ModulesName.Hosts:
			return { api: useHostQuery(), idField: 'id' }
		case ModulesName.Passkeys:
			return { api: usePasskeyQuery(), idField: 'id' }
		case ModulesName.Commands:
			return { api: useCommandQuery(), idField: 'key' }
		case ModulesName.Variables:
			return { api: useVariableQuery(), idField: 'id' }
		default:
			return { api: useVariableQuery(), idField: 'id' }
	}
}
