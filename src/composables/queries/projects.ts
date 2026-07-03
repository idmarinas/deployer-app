import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { normalizeDeep } from '@/lib/normalize'
import { project_hosts, project_tasks, projects } from '@/lib/schema'
import { Host, Project, ProjectHost, ProjectTask, ProjectVariable, Task } from '@/types/tauri-types'

export type ProjectHostRow = ProjectHost & {
	host: Partial<Host>
}

export type ProjectTaskRow = ProjectTask & {
	task: Partial<Task>
}

export type ProjectRow = Project & {
	project_hosts: ProjectHostRow[]
	project_tasks: ProjectTaskRow[]
	project_variables: ProjectVariable[]
}

/**
 * Lectura de un proyecto con sus relaciones (hosts, tasks, variables) via
 * Drizzle Relational Queries API (db.query.*), no con leftJoin manual.
 *
 * Por qué: projects -> hosts/tasks/variables son relaciones 1:N. Encadenar
 * varios leftJoin en una sola query genera el producto cartesiano de esas
 * tablas relacionadas (ej. 2 hosts x 3 tasks x 4 variables = 24 filas), y
 * tomar solo la primera fila con .limit(1) no representa "todos los hijos",
 * solo una combinación arbitraria de uno de cada. db.query.findFirst hace
 * varias queries por debajo y anida los resultados correctamente.
 *
 * El resultado se pasa por normalizeDeep antes de devolverlo: Drizzle infiere
 * `enabled`/`is_secret` como string (numeric() en SQLite, sin detección de
 * boolean en introspect) y los campos nullable como `T | null` en vez de
 * `T | undefined`. normalizeDeep corrige ambos en runtime para que el dato
 * real coincida con el tipo `Project`/`ProjectHost`/... de ts-rs.
 *
 * El cast pasa por `unknown` a propósito: normalizeDeep<T> devuelve el mismo
 * tipo T de entrada (el inferido por Drizzle, con enabled: string), así que
 * TypeScript no puede ver que la forma ya coincide con ProjectRow tras la
 * normalización — el `unknown` es la forma explícita de decir "esto ya está
 * garantizado en runtime", no un cast a ciegas.
 */
export function useProjectQuery() {
	async function find(id: number): Promise<ProjectRow | undefined> {
		try {
			const row = await db.query.projects.findFirst({
				where: eq(projects.id, id),
				with: {
					project_hosts: {
						orderBy: (ph, { asc }) => asc(ph.deploy_order),
						with: {
							host: {
								columns: {
									id: true,
									name: true,
									username: true,
									description: true,
									host: true,
									enabled: true,
								},
							},
						},
					},
					project_tasks: {
						orderBy: (pt, { asc }) => asc(pt.order_execution),
						with: {
							task: {
								columns: {
									id: true,
									name: true,
									type: true,
									enabled: true,
								},
							},
						},
					},
					project_variables: true,
				},
			})

			if (!row) return undefined

			return normalizeDeep(row) as unknown as ProjectRow
		} catch (e) {
			console.error('[projects] find error:', e)
			return undefined
		}
	}

	async function findAll(): Promise<ProjectRow[]> {
		try {
			const rows = await db.query.projects.findMany({
				columns: {
					id: true,
					name: true,
					enabled: true,
					git_url: true,
				},
			})

			return rows.map(row => normalizeDeep(row) as unknown as ProjectRow)
		} catch (e) {
			console.error('[projects] findAll error:', e)
			return []
		}
	}

	async function findProjectHostById(id: number): Promise<ProjectHostRow | undefined> {
		try {
			const row = await db.query.project_hosts.findFirst({
				where: eq(project_hosts.id, id),
				with: {
					host: true,
				},
			})

			if (!row) return undefined

			return normalizeDeep(row) as unknown as ProjectHostRow
		} catch (e) {
			console.error('[projects] findProjectHostById error:', e)
			return undefined
		}
	}

	async function findProjectTaskById(id: number): Promise<ProjectTaskRow | undefined> {
		try {
			const row = await db.query.project_tasks.findFirst({
				where: eq(project_tasks.id, id),
				with: {
					task: {
						columns: {
							id: true,
							name: true,
							type: true,
							enabled: true,
						},
					},
				},
			})

			if (!row) return undefined

			return normalizeDeep(row) as unknown as ProjectTaskRow
		} catch (e) {
			console.error('[projects] findProjectTaskById error:', e)
			return undefined
		}
	}

	return { find, findAll, findProjectHostById, findProjectTaskById }
}
