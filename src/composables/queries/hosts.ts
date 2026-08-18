import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { hosts as deployer_hosts } from '@/lib/schema'
import { Host } from '@/types/tauri-types'

export function useHostQuery() {
	async function findAll(): Promise<Host[]> {
		return db
			.select()
			.from(deployer_hosts)
			.then(rows => rows.map(row => row as unknown as Host))
			.catch(e => {
				console.error('[hosts] findAll error:', e)
				return []
			})
	}

	async function find(id: number): Promise<Host | undefined> {
		return db
			.select()
			.from(deployer_hosts)
			.where(eq(deployer_hosts.id, id))
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Host
			})
			.catch(e => {
				console.error('[hosts] find error:', e)
				return undefined
			})
	}

	async function create(data: Omit<Host, 'id' | 'created_at' | 'updated_at'>): Promise<Host | undefined> {
		return db
			.insert(deployer_hosts)
			.values(data as any)
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Host
			})
			.catch(e => {
				console.error('[hosts] create error:', e)
				return undefined
			})
	}

	async function update(
		id: number,
		data: Partial<Omit<Host, 'id' | 'created_at' | 'updated_at'>>,
	): Promise<Host | undefined> {
		return db
			.update(deployer_hosts)
			.set({ ...data, updated_at: new Date().toISOString() } as any)
			.where(eq(deployer_hosts.id, id))
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as Host
			})
			.catch(e => {
				console.error('[hosts] update error:', e)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		return db
			.delete(deployer_hosts)
			.where(eq(deployer_hosts.id, id))
			.then(() => true)
			.catch(e => {
				console.error('[hosts] delete error:', e)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
