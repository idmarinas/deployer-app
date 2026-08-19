import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, r => ({
	hosts: {
		passkey: r.one.passkeys({
			from: r.hosts.key_id,
			to: r.passkeys.id,
		}),
		docker_compose: r.many.projects_docker_compose(),
	},
	passkeys: {
		hosts: r.many.hosts(),
	},
	projects_docker_compose: {
		host: r.one.hosts({
			from: r.projects_docker_compose.host_id,
			to: r.hosts.id,
		}),
		docker_compose_files: r.many.projects_docker_compose_files(),
	},
	projects_docker_compose_files: {
		docker_compose: r.one.projects_docker_compose({
			from: r.projects_docker_compose_files.module_id,
			to: r.projects_docker_compose.id,
		}),
	},
}))
