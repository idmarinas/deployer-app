// Auto-generado desde la BD SQLite

export interface SqlxMigrations {
  version?: number;
  description: string;
  installed_on: Date | string;
  success: any;
  checksum: Buffer;
  execution_time: number;
}

export interface DeployerSettings {
  key?: string;
  value: string;
}

export interface Passkeys {
  id?: number;
  name: string;
  key_content: string;
  passphrase?: string;
  key_type?: string;
  fingerprint?: string;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface Hosts {
  id?: number;
  name: string;
  host: string;
  port?: number;
  username: string;
  auth_type: string;
  password?: string;
  key_id?: number;
  description?: string;
  enabled?: any;
  created_at?: Date | string;
  updated_at?: Date | string;
  key?: Passkeys; // FK → passkeys.id
}

export interface GlobalVariables {
  id?: number;
  name: string;
  value: string;
  is_secret?: any;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface Projects {
  id?: number;
  name: string;
  description?: string;
  repository_url?: string;
  framework?: string;
  enabled?: any;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ProjectHosts {
  id?: number;
  project_id: number;
  host_id: number;
  deploy_order?: number;
  enabled?: any;
  created_at?: Date | string;
  host?: Hosts; // FK → hosts.id
  project?: Projects; // FK → projects.id
}

export interface ProjectVariables {
  id?: number;
  project_id: number;
  name: string;
  value: string;
  is_secret?: any;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  project?: Projects; // FK → projects.id
}

export interface FrameworkConfigs {
  id?: number;
  project_id: number;
  framework: string;
  key: string;
  value: string;
  is_secret?: any;
  data_type?: string;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  project?: Projects; // FK → projects.id
}

export interface Tasks {
  id?: number;
  name: string;
  description?: string;
  type: string;
  command?: string;
  working_dir?: string;
  timeout?: number;
  retry_count?: number;
  enabled?: any;
  is_global?: any;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ProjectTasks {
  id?: number;
  project_id: number;
  task_id: number;
  order_execution: number;
  enabled?: any;
  condition?: string;
  on_failure?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  task?: Tasks; // FK → tasks.id
  project?: Projects; // FK → projects.id
}

export interface TaskDependencies {
  id?: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type?: string;
  created_at?: Date | string;
  dependsOnTask?: ProjectTasks; // FK → project_tasks.id
  task?: ProjectTasks; // FK → project_tasks.id
}

export interface Deployments {
  id?: number;
  project_id: number;
  version: string;
  tag: string;
  build: number;
  status?: string;
  started_at?: Date | string;
  finished_at?: Date | string;
  duration_seconds?: number;
  triggered_by?: string;
  notes?: string;
  created_at?: Date | string;
  project?: Projects; // FK → projects.id
}

export interface DeploymentExecutions {
  id?: number;
  deployment_id: number;
  host_id: number;
  task_id: number;
  status?: string;
  exit_code?: number;
  output?: string;
  error_message?: string;
  started_at?: Date | string;
  finished_at?: Date | string;
  duration_seconds?: number;
  retry_attempt?: number;
  created_at?: Date | string;
  task?: ProjectTasks; // FK → project_tasks.id
  host?: Hosts; // FK → hosts.id
  deployment?: Deployments; // FK → deployments.id
}

export interface DeploymentRollbacks {
  id?: number;
  deployment_id: number;
  rolled_back_to_deployment_id: number;
  status?: string;
  reason?: string;
  triggered_by?: string;
  started_at?: Date | string;
  finished_at?: Date | string;
  created_at?: Date | string;
  rolledBackToDeployment?: Deployments; // FK → deployments.id
  deployment?: Deployments; // FK → deployments.id
}

