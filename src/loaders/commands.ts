import { useCommandQuery } from '@/composables/queries/commands'

import { db } from '@/drizzle/drizzle'
import { commands as commandsSchema } from '@/drizzle/schema'
import { asc, isNull } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export const useCommandsListAll = defineColadaLoader('dashboard-commands', {
	key: ['commands', 'all', 'list', 'list-all'],
	query: async () => {
		return await useCommandQuery().findAll()
	},
})

export const useCommandByKey = defineColadaLoader('dashboard-commands-key-edit', {
	key: to => ['commands', 'command', `command-${to.params.key}`],
	query: async to => {
		const key = String(to.params.key)
		const result = await useCommandQuery().find(key)

		if (!result) {
			throw new Error('not-found')
		}

		return result
	},
})

export const useCommandOptions = defineColadaLoader({
	key: ['commands', 'options'],
	query: async () =>
		await db
			.select({
				key: commandsSchema.key,
				label: commandsSchema.name,
				enabled: commandsSchema.enabled,
			})
			.from(commandsSchema)
			.where(isNull(commandsSchema.deleted_at))
			.orderBy(asc(commandsSchema.name)),
})
