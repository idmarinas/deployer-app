import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { deployer_docker_composes } from '@/lib/schema'
import { DockerCompose } from '@/types/tauri-types'

export function useDockerComposeQuery() {
	async function findAll(): Promise<DockerCompose[]> {
		return db.select()
			.from(deployer_docker_composes)
			.then(rows => rows.map(row => row as unknown as DockerCompose))
			.catch(e => {
				console.error('[docker_composes] findAll error:', e)
				return []
			})
	}

	async function find(id: number): Promise<DockerCompose | undefined> {
		return db.select()
			.from(deployer_docker_composes)
			.where(eq(deployer_docker_composes.id, id))
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as DockerCompose
			})
			.catch(e => {
				console.error('[docker_composes] find error:', e)
				return undefined
			})
	}

	async function create(data: Omit<DockerCompose, 'id' | 'created_at' | 'updated_at'>): Promise<DockerCompose | undefined> {
		return db.insert(deployer_docker_composes)
			.values(data as any)
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as DockerCompose
			})
			.catch(e => {
				console.error('[docker_composes] create error:', e)
				return undefined
			})
	}

	async function update(id: number, data: Partial<Omit<DockerCompose, 'id' | 'created_at' | 'updated_at'>>): Promise<DockerCompose | undefined> {
		return db.update(deployer_docker_composes)
			.set({ ...data, updated_at: new Date().toISOString() } as any)
			.where(eq(deployer_docker_composes.id, id))
			.returning()
			.then(rows => {
				const row = rows[0]
				if (!row) return undefined
				return row as unknown as DockerCompose
			})
			.catch(e => {
				console.error('[docker_composes] update error:', e)
				return undefined
			})
	}

	async function remove(id: number): Promise<boolean> {
		return db.delete(deployer_docker_composes)
			.where(eq(deployer_docker_composes.id, id))
			.then(() => true)
			.catch(e => {
				console.error('[docker_composes] delete error:', e)
				return false
			})
	}

	return { findAll, find, create, update, remove }
}
