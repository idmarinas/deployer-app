import { relations } from 'drizzle-orm'
import { hosts } from './entities/hosts'
import { passkeys } from './entities/passkeys'
import { projects_docker_compose } from './entities/projects_docker_compose'
import { projects_docker_compose_files } from './entities/projects_docker_compose_files'

export const deployer_hostsRelations = relations(hosts, ({ one, many }) => ({
	deployer_passkey: one(passkeys, {
		fields: [hosts.key_id],
		references: [passkeys.id],
	}),
	projects_docker_compose: many(projects_docker_compose),
}))

export const deployer_passkeysRelations = relations(passkeys, ({ many }) => ({
	hosts: many(hosts),
}))

export const deployer_docker_composesRelations = relations(projects_docker_compose, ({ one, many }) => ({
	deployer_host: one(hosts, {
		fields: [projects_docker_compose.host_id],
		references: [hosts.id],
	}),
	projects_docker_compose_files: many(projects_docker_compose_files),
}))

export const deployer_docker_compose_filesRelations = relations(projects_docker_compose_files, ({ one }) => ({
	deployer_docker_compose: one(projects_docker_compose, {
		fields: [projects_docker_compose_files.module_id],
		references: [projects_docker_compose.id],
	}),
}))
