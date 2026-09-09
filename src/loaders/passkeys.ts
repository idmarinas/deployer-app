import { usePasskeyQuery } from '@/composables/queries/passkeys'

import { db } from '@/drizzle/drizzle'
import { passkeys as passkeysSchema } from '@/drizzle/schema'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

const passkeysQuery = usePasskeyQuery()

export const useSelectPasskeys = defineColadaLoader({
	key: ['passkeys', 'select'],
	query: async () => {
		return await db
			.select({
				label: passkeysSchema.name,
				id: passkeysSchema.id,
				key_type: passkeysSchema.key_type,
				enabled: passkeysSchema.enabled,
			})
			.from(passkeysSchema)
	},
})

export const usePasskeysListAll = defineColadaLoader({
	key: ['passkeys', 'all', 'list', 'list-all'],
	query: async () => {
		return await passkeysQuery.findAll()
	},
})

export const usePasskeyById = defineColadaLoader('dashboard-passkeys-id', {
	key: to => ['passkeys', 'passkey', `passkey-${to.params.id}`],
	query: async to => {
		const id = Number.parseInt(to.params.id)
		const result = await passkeysQuery.find(id)

		if (!result) {
			throw new Error('not-found')
		}

		return result
	},
})
