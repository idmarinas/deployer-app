import type { CommandResponse, Task } from '@/types/tauri-types'

import { db } from '@/lib/db'
import { tasks } from '@/lib/schema'
import { invoke } from '@tauri-apps/api/core'
import { asc } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export const useTaskById = defineColadaLoader('dashboard-tasks-id-edit', {
	key: to => ['tasks', `task-${to.params.id}`],
	async query(to) {
		const id = Number.parseInt(to.params.id)
		const result = await invoke<CommandResponse<Task>>('crud_get_task', { id })

		if (!result.success || !result.data) {
			throw new Error('not-found')
		}

		return result.data
	},
})

export const useTaskListAll = defineColadaLoader('dashboard-tasks', {
	key: () => ['tasks', 'all'],
	query: async () =>
		await db
			.select()
			.from(tasks)
			.orderBy(asc(tasks.name))
			.then(data => data as unknown as Task[])
			.catch(() => []),
})

export interface TaskSelectItem {
	id: number
	label: string
	task_type: string
	enabled: boolean
}

/** Catálogo ligero para selectores (ej. asignar tasks a un proyecto). */
export const useTaskSelectPopulate = defineColadaLoader({
	key: () => ['tasks', 'select', 'populate'],
	query: async () =>
		await db
			.select({
				id: tasks.id,
				label: tasks.name,
				tasks_type: tasks.type,
				enabled: tasks.enabled,
			})
			.from(tasks)
			.orderBy(asc(tasks.name))
			.then(data => data as unknown as TaskSelectItem[])
			.catch(() => [] as TaskSelectItem[]),
})
