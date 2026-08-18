import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { deployer_passkeys } from '@/lib/schema'
import { Passkey } from '@/types/tauri-types'

export function usePasskeyQuery() {
	async function findAll(): Promise<Passkey[]> {
		return db.select()
			.from(deployer_passkeys)
			.then(rows => rows.map(row => row as unknown as Passkey))
			.catch(e => {
				console.error('[passkeys] findAll error:', e)
				return []
			})
	}

	async function find(id: number): Promise<Passkey | undefined> {
		return db.select()
			.from(deployer_passkeys)
			.where(eq(deployer_passkeys.id, id))
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Passkey
			})
			.catch(e => {
				console.error('[passkeys] find error:', e)
				return undefined
			})
	}

	async function create(data: Omit<Passkey, 'id' | 'created_at' | 'updated_at'>): Promise<Passkey | undefined> {
		return db.insert(deployer_passkeys)
			.values(data as any)
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Passkey
			})
			.catch(e => {
				console.error('[passkeys] create error:', e)
				return undefined
			})
	}

	async function update(id: number, data: Partial<Omit<Passkey, 'id' | 'created_at' | 'updated_at'>>): Promise<Passkey | undefined> {
		return db.update(deployer_passkeys)
			.set({ ...data, updated_at: new Date().toISOString() } as any)
			.where(eq(deployer_passkeys.id, id))
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Passkey
			})
			.catch(e => {
				console.error('[passkeys] update error:', e)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		return db.delete(deployer_passkeys)
			.where(eq(deployer_passkeys.id, id))
			.then(() => true)
			.catch(e => {
				console.error('[passkeys] delete error:', e)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
