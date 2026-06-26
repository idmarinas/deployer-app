import { relations } from "drizzle-orm/relations";
import { passkeys, hosts, projectHosts, projects, projectVariables, frameworkConfigs, tasks, projectTasks, taskDependencies, deployments, deploymentExecutions, deploymentRollbacks } from "./schema";

export const hostsRelations = relations(hosts, ({one, many}) => ({
	passkey: one(passkeys, {
		fields: [hosts.keyId],
		references: [passkeys.id]
	}),
	projectHosts: many(projectHosts),
	deploymentExecutions: many(deploymentExecutions),
}));

export const passkeysRelations = relations(passkeys, ({many}) => ({
	hosts: many(hosts),
}));

export const projectHostsRelations = relations(projectHosts, ({one}) => ({
	host: one(hosts, {
		fields: [projectHosts.hostId],
		references: [hosts.id]
	}),
	project: one(projects, {
		fields: [projectHosts.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	projectHosts: many(projectHosts),
	projectVariables: many(projectVariables),
	frameworkConfigs: many(frameworkConfigs),
	projectTasks: many(projectTasks),
	deployments: many(deployments),
}));

export const projectVariablesRelations = relations(projectVariables, ({one}) => ({
	project: one(projects, {
		fields: [projectVariables.projectId],
		references: [projects.id]
	}),
}));

export const frameworkConfigsRelations = relations(frameworkConfigs, ({one}) => ({
	project: one(projects, {
		fields: [frameworkConfigs.projectId],
		references: [projects.id]
	}),
}));

export const projectTasksRelations = relations(projectTasks, ({one, many}) => ({
	task: one(tasks, {
		fields: [projectTasks.taskId],
		references: [tasks.id]
	}),
	project: one(projects, {
		fields: [projectTasks.projectId],
		references: [projects.id]
	}),
	taskDependencies_dependsOnTaskId: many(taskDependencies, {
		relationName: "taskDependencies_dependsOnTaskId_projectTasks_id"
	}),
	taskDependencies_taskId: many(taskDependencies, {
		relationName: "taskDependencies_taskId_projectTasks_id"
	}),
	deploymentExecutions: many(deploymentExecutions),
}));

export const tasksRelations = relations(tasks, ({many}) => ({
	projectTasks: many(projectTasks),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({one}) => ({
	projectTask_dependsOnTaskId: one(projectTasks, {
		fields: [taskDependencies.dependsOnTaskId],
		references: [projectTasks.id],
		relationName: "taskDependencies_dependsOnTaskId_projectTasks_id"
	}),
	projectTask_taskId: one(projectTasks, {
		fields: [taskDependencies.taskId],
		references: [projectTasks.id],
		relationName: "taskDependencies_taskId_projectTasks_id"
	}),
}));

export const deploymentsRelations = relations(deployments, ({one, many}) => ({
	project: one(projects, {
		fields: [deployments.projectId],
		references: [projects.id]
	}),
	deploymentExecutions: many(deploymentExecutions),
	deploymentRollbacks_rolledBackToDeploymentId: many(deploymentRollbacks, {
		relationName: "deploymentRollbacks_rolledBackToDeploymentId_deployments_id"
	}),
	deploymentRollbacks_deploymentId: many(deploymentRollbacks, {
		relationName: "deploymentRollbacks_deploymentId_deployments_id"
	}),
}));

export const deploymentExecutionsRelations = relations(deploymentExecutions, ({one}) => ({
	projectTask: one(projectTasks, {
		fields: [deploymentExecutions.taskId],
		references: [projectTasks.id]
	}),
	host: one(hosts, {
		fields: [deploymentExecutions.hostId],
		references: [hosts.id]
	}),
	deployment: one(deployments, {
		fields: [deploymentExecutions.deploymentId],
		references: [deployments.id]
	}),
}));

export const deploymentRollbacksRelations = relations(deploymentRollbacks, ({one}) => ({
	deployment_rolledBackToDeploymentId: one(deployments, {
		fields: [deploymentRollbacks.rolledBackToDeploymentId],
		references: [deployments.id],
		relationName: "deploymentRollbacks_rolledBackToDeploymentId_deployments_id"
	}),
	deployment_deploymentId: one(deployments, {
		fields: [deploymentRollbacks.deploymentId],
		references: [deployments.id],
		relationName: "deploymentRollbacks_deploymentId_deployments_id"
	}),
}));