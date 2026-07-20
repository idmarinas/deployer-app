// @ts-nocheck
import { relations } from "drizzle-orm/relations";
import { passkeys, hosts, project_hosts, projects, project_variables, framework_configs, tasks, project_tasks, task_dependencies, deployments, deployment_executions, deployment_rollbacks, docker_composes } from "./schema";

export const hostsRelations = relations(hosts, ({one, many}) => ({
	passkey: one(passkeys, {
		fields: [hosts.key_id],
		references: [passkeys.id]
	}),
	project_hosts: many(project_hosts),
	deployment_executions: many(deployment_executions),
	docker_composes: many(docker_composes),
}));

export const passkeysRelations = relations(passkeys, ({many}) => ({
	hosts: many(hosts),
}));

export const project_hostsRelations = relations(project_hosts, ({one}) => ({
	host: one(hosts, {
		fields: [project_hosts.host_id],
		references: [hosts.id]
	}),
	project: one(projects, {
		fields: [project_hosts.project_id],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	project_hosts: many(project_hosts),
	project_variables: many(project_variables),
	framework_configs: many(framework_configs),
	project_tasks: many(project_tasks),
	deployments: many(deployments),
}));

export const project_variablesRelations = relations(project_variables, ({one}) => ({
	project: one(projects, {
		fields: [project_variables.project_id],
		references: [projects.id]
	}),
}));

export const framework_configsRelations = relations(framework_configs, ({one}) => ({
	project: one(projects, {
		fields: [framework_configs.project_id],
		references: [projects.id]
	}),
}));

export const project_tasksRelations = relations(project_tasks, ({one, many}) => ({
	task: one(tasks, {
		fields: [project_tasks.task_id],
		references: [tasks.id]
	}),
	project: one(projects, {
		fields: [project_tasks.project_id],
		references: [projects.id]
	}),
	task_dependencies_depends_on_task_id: many(task_dependencies, {
		relationName: "task_dependencies_depends_on_task_id_project_tasks_id"
	}),
	task_dependencies_task_id: many(task_dependencies, {
		relationName: "task_dependencies_task_id_project_tasks_id"
	}),
	deployment_executions: many(deployment_executions),
}));

export const tasksRelations = relations(tasks, ({many}) => ({
	project_tasks: many(project_tasks),
}));

export const task_dependenciesRelations = relations(task_dependencies, ({one}) => ({
	project_task_depends_on_task_id: one(project_tasks, {
		fields: [task_dependencies.depends_on_task_id],
		references: [project_tasks.id],
		relationName: "task_dependencies_depends_on_task_id_project_tasks_id"
	}),
	project_task_task_id: one(project_tasks, {
		fields: [task_dependencies.task_id],
		references: [project_tasks.id],
		relationName: "task_dependencies_task_id_project_tasks_id"
	}),
}));

export const deploymentsRelations = relations(deployments, ({one, many}) => ({
	project: one(projects, {
		fields: [deployments.project_id],
		references: [projects.id]
	}),
	deployment_executions: many(deployment_executions),
	deployment_rollbacks_rolled_back_to_deployment_id: many(deployment_rollbacks, {
		relationName: "deployment_rollbacks_rolled_back_to_deployment_id_deployments_id"
	}),
	deployment_rollbacks_deployment_id: many(deployment_rollbacks, {
		relationName: "deployment_rollbacks_deployment_id_deployments_id"
	}),
}));

export const deployment_executionsRelations = relations(deployment_executions, ({one}) => ({
	project_task: one(project_tasks, {
		fields: [deployment_executions.task_id],
		references: [project_tasks.id]
	}),
	host: one(hosts, {
		fields: [deployment_executions.host_id],
		references: [hosts.id]
	}),
	deployment: one(deployments, {
		fields: [deployment_executions.deployment_id],
		references: [deployments.id]
	}),
}));

export const deployment_rollbacksRelations = relations(deployment_rollbacks, ({one}) => ({
	deployment_rolled_back_to_deployment_id: one(deployments, {
		fields: [deployment_rollbacks.rolled_back_to_deployment_id],
		references: [deployments.id],
		relationName: "deployment_rollbacks_rolled_back_to_deployment_id_deployments_id"
	}),
	deployment_deployment_id: one(deployments, {
		fields: [deployment_rollbacks.deployment_id],
		references: [deployments.id],
		relationName: "deployment_rollbacks_deployment_id_deployments_id"
	}),
}));

export const docker_composesRelations = relations(docker_composes, ({one}) => ({
	host: one(hosts, {
		fields: [docker_composes.host_id],
		references: [hosts.id]
	}),
}));