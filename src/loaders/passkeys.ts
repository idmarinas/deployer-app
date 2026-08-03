import { CommandResponse, type Passkey } from '@/types/tauri-types'
import { invoke } from '@tauri-apps/api/core'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export const useSelectPasskeys = defineColadaLoader({
	key: ['passkeys', 'select'],
	query: async () => {
		const result = await invoke<CommandResponse<Passkey[]>>('crud_list_passkeys')

		return (
			result.data?.map(item => ({
				label: item.name,
				id: item.id,
			})) || ([] as Passkey[])
		)
	},
})

export const usePasskeysListAll = defineColadaLoader({
	key: ['passkeys', 'all', 'list', 'list-all'],
	query: async () => {
		const result = await invoke<CommandResponse<Passkey[]>>('crud_list_passkeys')

		if (!result.success || !result.data) {
			throw new Error('not-found')
		}

		return result.data || ([] as Passkey[])
	},
})

export const usePasskeyById = defineColadaLoader('dashboard-passkeys-id-edit', {
	key: to => ['passkeys', 'passkey', `passkey-${to.params.id}`],
	query: async to => {
		const id = Number.parseInt(to.params.id)
		const result = await invoke<CommandResponse<Passkey>>('crud_get_passkey', { id })

		if (!result.success || !result.data) {
			throw new Error('not-found')
		}

		return result.data as Passkey
	},
})
