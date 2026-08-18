import { db } from '@/lib/db'
import {
	deployer_docker_compose_files as docker_compose_files,
	deployer_docker_composes as docker_composes,
	deployer_hosts as hosts,
} from '@/lib/schema'
import { asc, eq, getTableColumns } from 'drizzle-orm'
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'

export interface DockerComposeListItem {
	id: number
	name: string
	description: any | null
	host_id: number | null
	remote_path: string
	enabled: boolean
	created_at: string
	updated_at: string
	host_name: string | null
	files_count: number
}

export interface DockerComposeSelectItem {
	id: number
	label: string
	host_id: number | null
	enabled: boolean
}

export const useDockerComposeById = defineColadaLoader('dashboard-docker_composes-id', {
	key: to => ['docker_composes', `docker_compose-${to.params.id}`],
	query: async to =>
		await db.query.deployer_docker_composes
			.findFirst({
				where: eq(docker_composes.id, Number.parseInt(to.params.id)),
				with: {
					deployer_docker_compose_files: true,
					deployer_host: {
						columns: {
							name: true,
						},
					},
				},
			})
			.then(result => {
				const data = {
					...result,
					files: result?.deployer_docker_compose_files,
					host_name: result?.deployer_host?.name,
				}

				delete data.deployer_docker_compose_files
				delete data.deployer_host

				return data
			})
			.catch(() => undefined),
})

export const useDockerComposeListAll = defineColadaLoader('dashboard-docker_composes', {
	key: () => ['docker_composes', 'all'],
	query: async () =>
		await db
			.select({
				...getTableColumns(docker_composes),
				host_name: hosts.name,
				files_count: db.$count(docker_compose_files, eq(docker_compose_files.module_id, docker_composes.id)),
			})
			.from(docker_composes)
			.leftJoin(hosts, eq(docker_composes.host_id, hosts.id))
			.orderBy(asc(docker_composes.name))
			.then(data => data as unknown as DockerComposeListItem[])
			.catch(() => [] as DockerComposeListItem[]),
})

export const useDockerComposeSelectPopulate = defineColadaLoader({
	key: () => ['docker_composes', 'select', 'populate'],
	query: async () =>
		await db
			.select({
				id: docker_composes.id,
				label: docker_composes.name,
				host_id: docker_composes.host_id,
				enabled: docker_composes.enabled,
			})
			.from(docker_composes)
			.orderBy(asc(docker_composes.name))
			.then(data => data as unknown as DockerComposeSelectItem[])
			.catch(() => [] as DockerComposeSelectItem[]),
})