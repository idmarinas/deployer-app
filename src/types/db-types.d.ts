// Auto-generado desde la BD SQLite
// ⚠️ NO EDITAR MANUALMENTE - Regenerar con: bun run generate-types.ts
// Generado desde migraciones en: ./src-tauri/migrations

export interface SqlxMigrations {
  version?: number;
  description: string;
  installed_on: Date;
  success: boolean;
  checksum: Buffer;
  execution_time: number;
}

export interface DeployerSettings {
  key?: string;
  value?: string;
}

export interface DeploymentExecutions {
  id?: number;
  deployment_id: number;
  host_id: number;
  task_id: number;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  exit_code?: number;
  output?: string;
  error_message?: string;
  started_at?: Date;
  finished_at?: Date;
  duration_seconds?: number;
  retry_attempt: number;
  created_at: Date;
  task?: ProjectTasks; // RELATION: FK task_id → project_tasks.id
  host?: Hosts; // RELATION: FK host_id → hosts.id
  deployment?: Deployments; // RELATION: FK deployment_id → deployments.id
}

export interface DeploymentRollbacks {
  id?: number;
  deployment_id: number;
  rolled_back_to_deployment_id: number;
  status: "pending" | "running" | "success" | "failed";
  reason?: string;
  triggered_by?: string;
  started_at?: Date;
  finished_at?: Date;
  created_at: Date;
  rolledBackToDeployment?: Deployments; // RELATION: FK rolled_back_to_deployment_id → deployments.id
  deployment?: Deployments; // RELATION: FK deployment_id → deployments.id
}

export interface Deployments {
  id?: number;
  project_id: number;
  version: string;
  tag: string;
  build: number;
  status: "pending" | "running" | "success" | "failed";
  started_at?: Date;
  finished_at?: Date;
  duration_seconds?: number;
  triggered_by?: string;
  notes?: string;
  created_at: Date;
  project?: Projects; // RELATION: FK project_id → projects.id
}

export interface FrameworkConfigs {
  id?: number;
  project_id: number;
  framework: string;
  key: string;
  value: string;
  is_secret: boolean;
  data_type: "string" | "integer" | "boolean" | "json";
  description?: string;
  created_at: Date;
  updated_at: Date;
  project?: Projects; // RELATION: FK project_id → projects.id
}

export interface GlobalVariables {
  id?: number;
  name: string;
  value: string;
  is_secret: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Hosts {
  id?: number;
  name: string;
  host: string;
  port: number;
  username?: string;
  auth_type: "password" | "key";
  password?: string;
  key_id?: number;
  description?: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  key?: Passkeys; // RELATION: FK key_id → passkeys.id
}

export interface Passkeys {
  id?: number;
  name: string;
  key_content: string;
  passphrase?: string;
  key_type?: "rsa" | "ed25519" | "ecdsa";
  fingerprint?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectHosts {
  id?: number;
  project_id: number;
  host_id: number;
  deploy_order?: number;
  enabled: boolean;
  created_at: Date;
  host?: Hosts; // RELATION: FK host_id → hosts.id
  project?: Projects; // RELATION: FK project_id → projects.id
}

export interface ProjectTasks {
  id?: number;
  project_id: number;
  task_id: number;
  order_execution: number;
  enabled: boolean;
  condition?: string;
  on_failure: "stop" | "continue" | "retry";
  created_at: Date;
  updated_at: Date;
  task?: Tasks; // RELATION: FK task_id → tasks.id
  project?: Projects; // RELATION: FK project_id → projects.id
}

export interface ProjectVariables {
  id?: number;
  project_id: number;
  name: string;
  value: string;
  is_secret: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
  project?: Projects; // RELATION: FK project_id → projects.id
}

export interface Projects {
  id?: number;
  name: string;
  description?: string;
  repository_url?: string;
  framework?: "symfony" | "laravel" | "nextjs" | "generic";
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TaskDependencies {
  id?: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: "success" | "failure" | "always";
  created_at: Date;
  dependsOnTask?: ProjectTasks; // RELATION: FK depends_on_task_id → project_tasks.id
  task?: ProjectTasks; // RELATION: FK task_id → project_tasks.id
}

export interface Tasks {
  id?: number;
  name: string;
  description?: string;
  type: "command" | "upload_file" | "download_file" | "script";
  command?: string;
  working_dir?: string;
  timeout: number;
  retry_count: number;
  enabled: boolean;
  is_global: boolean;
  created_at: Date;
  updated_at: Date;
}

