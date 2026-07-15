// import type { CommandResponse, Project } from '@/types/tauri-types'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

import { useQuery } from '@/composables/useQuery'
// import { invoke } from '@tauri-apps/api/core'

export const useGlobalVariablesList = defineColadaLoader('dashboard-global_variables', {
	key: () => ['global_variables', 'global_variables-list', 'list'],
	query: async () => {
		const { globalVariables } = useQuery()

		return await globalVariables.findAll()
	},
})

export const useGlobalVariableById = defineColadaLoader('dashboard-global_variables-id-edit', {
	key: to => ['global_variables', 'global-variable', `global_variables-${to.params.id}`],
	query: async to => {
		const { globalVariables } = useQuery()

		return await globalVariables.find(Number.parseInt(to.params.id))
	},
})
