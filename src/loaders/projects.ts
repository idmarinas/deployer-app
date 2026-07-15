import type { CommandResponse, Project } from '@/types/tauri-types'

import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

import { useQuery } from '@/composables/useQuery'
import { invoke } from '@tauri-apps/api/core'

export const useProjectsList = defineColadaLoader('dashboard-projects', {
	key: () => ['projects', 'projects-list', 'list'],
	query: async () => {
		const { projects } = useQuery()

		return await projects.findAll()
	},
})

export const useProjectsListMenu = defineColadaLoader('dashboard-projects', {
	key: () => ['projects', 'projects-list', 'projects-menu', 'menu'],
	query: async () => {
		const result = await invoke<CommandResponse<Project[]>>('crud_list_projects')

		if (!result.success || !result.data) {
			throw new Error('not-found')
		}

		return result.data || ([] as Project[])
	},
})

export const useProjectById = defineColadaLoader('dashboard-projects-id', {
	key: to => ['projects', 'project', `project-${to.params.id}`],
	async query(to) {
		const id = Number.parseInt(to.params.id)

		const { projects } = useQuery()

		const result = await projects.find(id)

		if (!result) {
			throw new Error('not-found')
		}

		return result
	},
})
