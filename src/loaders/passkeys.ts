import { useQuery } from '@/composables/useQuery'

import { db } from '@/drizzle/drizzle'
import { passkeys as passkeysSchema } from '@/drizzle/schema'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

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
		const { passkeys } = useQuery()
		return await passkeys.findAll()
	},
})

export const usePasskeyById = defineColadaLoader('dashboard-passkeys-id', {
	key: to => ['passkeys', 'passkey', `passkey-${to.params.id}`],
	query: async to => {
		const id = Number.parseInt(to.params.id)
		const { passkeys } = useQuery()
		const result = await passkeys.find(id)

		if (!result) {
			throw new Error('not-found')
		}

		return result
	},
})
