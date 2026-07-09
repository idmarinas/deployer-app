-- ============================================================================
-- Migration 1: Drop All Tables (Rollback)
-- ============================================================================

DROP TRIGGER IF EXISTS project_tasks_trg_set_updated_at;

DROP TRIGGER IF EXISTS tasks_trg_set_updated_at;

DROP TRIGGER IF EXISTS framework_configs_trg_set_updated_at;

DROP TRIGGER IF EXISTS project_variables_trg_set_updated_at;

DROP TRIGGER IF EXISTS projects_trg_set_updated_at;

DROP TRIGGER IF EXISTS global_variables_trg_set_updated_at;

DROP TRIGGER IF EXISTS hosts_trg_set_updated_at;

DROP TRIGGER IF EXISTS passkeys_trg_set_updated_at;

DROP TABLE IF EXISTS deployment_rollbacks;

DROP TABLE IF EXISTS deployment_executions;

DROP TABLE IF EXISTS deployments;

DROP TABLE IF EXISTS task_dependencies;

DROP TABLE IF EXISTS project_tasks;

DROP TABLE IF EXISTS tasks;

DROP TABLE IF EXISTS framework_configs;

DROP TABLE IF EXISTS project_variables;

DROP TABLE IF EXISTS project_hosts;

DROP TABLE IF EXISTS projects;

DROP TABLE IF EXISTS global_variables;

DROP TABLE IF EXISTS hosts;

DROP TABLE IF EXISTS passkeys;

DROP TABLE IF EXISTS deployer_settings;