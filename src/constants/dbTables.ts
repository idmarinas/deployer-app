export const DB_TABLES = {
  // App
  APP_SETTINGS: 'app_settings',

  // Hosts & Credentials
  PASSKEYS: 'passkeys',
  HOSTS: 'hosts',

  // Variables
  GLOBAL_VARIABLES: 'global_variables',

  // Projects
  PROJECTS: 'projects',
  PROJECT_HOSTS: 'project_hosts',
  PROJECT_VARIABLES: 'project_variables',
  FRAMEWORK_CONFIGS: 'framework_configs',

  // Tasks
  TASKS: 'tasks',
  PROJECT_TASKS: 'project_tasks',
  TASK_DEPENDENCIES: 'task_dependencies',

  // Deployments
  DEPLOYMENTS: 'deployments',
  DEPLOYMENT_EXECUTIONS: 'deployment_executions',
  DEPLOYMENT_ROLLBACKS: 'deployment_rollbacks',
} as const

export type DbTable = typeof DB_TABLES[keyof typeof DB_TABLES]