// @ts-nocheck
import { relations } from "drizzle-orm/relations";
import { deployer_passkeys, deployer_hosts, deployer_docker_composes } from "./schema";

export const deployer_hostsRelations = relations(deployer_hosts, ({one, many}) => ({
	deployer_passkey: one(deployer_passkeys, {
		fields: [deployer_hosts.key_id],
		references: [deployer_passkeys.id]
	}),
	deployer_docker_composes: many(deployer_docker_composes),
}));

export const deployer_passkeysRelations = relations(deployer_passkeys, ({many}) => ({
	deployer_hosts: many(deployer_hosts),
}));

export const deployer_docker_composesRelations = relations(deployer_docker_composes, ({one}) => ({
	deployer_host: one(deployer_hosts, {
		fields: [deployer_docker_composes.host_id],
		references: [deployer_hosts.id]
	}),
}));