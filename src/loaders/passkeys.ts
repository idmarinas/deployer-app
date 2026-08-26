import { useQuery } from '@/composables/useQuery'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export const useSelectPasskeys = defineColadaLoader({
	key: ['passkeys', 'select'],
	query: async () => {
		const { passkeys } = useQuery()
		const items = await passkeys.findAll()
		return items.map(item => ({ label: item.name, id: item.id, key_type: item.key_type }))
	},
})

export const usePasskeysListAll = defineColadaLoader({
	key: ['passkeys', 'all', 'list', 'list-all'],
	query: async () => {
		const { passkeys } = useQuery()
		return await passkeys.findAll()
	},
})

export const usePasskeyById = defineColadaLoader('dashboard-passkeys-id-edit', {
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
