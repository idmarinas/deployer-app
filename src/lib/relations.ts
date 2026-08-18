import { relations } from 'drizzle-orm'
import { deployer_docker_compose_files } from './entities/deployer_docker_compose_files'
import { deployer_docker_composes } from './entities/deployer_docker_composes'
import { deployer_hosts } from './entities/deployer_hosts'
import { deployer_passkeys } from './entities/deployer_passkeys'

export const deployer_hostsRelations = relations(deployer_hosts, ({ one, many }) => ({
	deployer_passkey: one(deployer_passkeys, {
		fields: [deployer_hosts.key_id],
		references: [deployer_passkeys.id],
	}),
	deployer_docker_composes: many(deployer_docker_composes),
}))

export const deployer_passkeysRelations = relations(deployer_passkeys, ({ many }) => ({
	deployer_hosts: many(deployer_hosts),
}))

export const deployer_docker_composesRelations = relations(deployer_docker_composes, ({ one, many }) => ({
	deployer_host: one(deployer_hosts, {
		fields: [deployer_docker_composes.host_id],
		references: [deployer_hosts.id],
	}),
	deployer_docker_compose_files: many(deployer_docker_compose_files),
}))

export const deployer_docker_compose_filesRelations = relations(deployer_docker_compose_files, ({ one }) => ({
	deployer_docker_compose: one(deployer_docker_composes, {
		fields: [deployer_docker_compose_files.module_id],
		references: [deployer_docker_composes.id],
	}),
}))
