import { db } from '@/drizzle/drizzle'
import { variables } from '@/drizzle/schema'
import { asc, eq } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export const loadVariableById = defineColadaLoader('dashboard-variables-id-edit', {
	key: to => ['variables', 'by-id', `variable-${to.params.id}`],
	query: async to =>
		await db
			.select()
			.from(variables)
			.where(eq(variables.id, Number.parseInt(to.params.id)))
			.limit(1)
			.then(data => data[0])
			.catch(() => undefined),
})

export const loadVariablesList = defineColadaLoader('dashboard-variables', {
	key: ['variables', 'all'],
	query: async () =>
		await db
			.select()
			.from(variables)
			.orderBy(asc(variables.id))
			.catch(() => []),
})
