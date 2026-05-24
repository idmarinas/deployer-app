-- ============================================================================
-- Migration 1: Initial Database Schema
-- ============================================================================

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================================
-- PASSKEYS (SSH Keys)
-- ============================================================================

CREATE TABLE passkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    key_content TEXT NOT NULL,
    passphrase TEXT,
    key_type TEXT CHECK(key_type IN ('rsa', 'ed25519', 'ecdsa')),
    fingerprint TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HOSTS
-- ============================================================================

CREATE TABLE hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'key')),
    password TEXT,
    key_id INTEGER,
    description TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES passkeys(id) ON DELETE SET NULL
);

CREATE INDEX idx_hosts_enabled ON hosts(enabled);
CREATE INDEX idx_hosts_key_id ON hosts(key_id);

-- ============================================================================
-- GLOBAL VARIABLES
-- ============================================================================

CREATE TABLE global_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_global_variables_name ON global_variables(name);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    repository_url TEXT,
    framework TEXT CHECK(framework IN ('symfony', 'laravel', 'nextjs', 'generic')),
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_enabled ON projects(enabled);

-- ============================================================================
-- PROJECT_HOSTS (N:N Relation)
-- ============================================================================

CREATE TABLE project_hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    host_id INTEGER NOT NULL,
    deploy_order INTEGER,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
    UNIQUE(project_id, host_id)
);

CREATE INDEX idx_project_hosts_project_id ON project_hosts(project_id);
CREATE INDEX idx_project_hosts_host_id ON project_hosts(host_id);
CREATE INDEX idx_project_hosts_deploy_order ON project_hosts(deploy_order);

-- ============================================================================
-- PROJECT_VARIABLES
-- ============================================================================

CREATE TABLE project_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, name)
);

CREATE INDEX idx_project_variables_project_id ON project_variables(project_id);
CREATE INDEX idx_project_variables_name ON project_variables(name);

-- ============================================================================
-- FRAMEWORK_CONFIGS (Generic, flexible configuration)
-- ============================================================================

CREATE TABLE framework_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    framework TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'integer', 'boolean', 'json')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, framework, key)
);

CREATE INDEX idx_framework_configs_project_id ON framework_configs(project_id);
CREATE INDEX idx_framework_configs_framework ON framework_configs(framework);
CREATE INDEX idx_framework_configs_key ON framework_configs(key);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('command', 'upload_file', 'download_file', 'script')),
    command TEXT,
    working_dir TEXT,
    timeout INTEGER DEFAULT 300,
    retry_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT 1,
    is_global BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_name ON tasks(name);
CREATE INDEX idx_tasks_enabled ON tasks(enabled);
CREATE INDEX idx_tasks_is_global ON tasks(is_global);

-- ============================================================================
-- PROJECT_TASKS (N:N Relation)
-- ============================================================================

CREATE TABLE project_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    order_execution INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    condition TEXT,
    on_failure TEXT DEFAULT 'stop' CHECK(on_failure IN ('stop', 'continue', 'retry')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(project_id, task_id, order_execution)
);

CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_task_id ON project_tasks(task_id);
CREATE INDEX idx_project_tasks_order ON project_tasks(order_execution);

-- ============================================================================
-- TASK_DEPENDENCIES
-- ============================================================================

CREATE TABLE task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    depends_on_task_id INTEGER NOT NULL,
    dependency_type TEXT DEFAULT 'success' CHECK(dependency_type IN ('success', 'failure', 'always')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================

CREATE TABLE deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    tag TEXT NOT NULL,
    build INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'success', 'failed')),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_seconds INTEGER,
    triggered_by TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_version ON deployments(version);
CREATE INDEX idx_deployments_created_at ON deployments(created_at);

-- ============================================================================
-- DEPLOYMENT_EXECUTIONS
-- ============================================================================

CREATE TABLE deployment_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL,
    host_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'success', 'failed', 'skipped')),
    exit_code INTEGER,
    output TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_seconds INTEGER,
    retry_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployment_executions_deployment_id ON deployment_executions(deployment_id);
CREATE INDEX idx_deployment_executions_host_id ON deployment_executions(host_id);
CREATE INDEX idx_deployment_executions_task_id ON deployment_executions(task_id);
CREATE INDEX idx_deployment_executions_status ON deployment_executions(status);

-- ============================================================================
-- DEPLOYMENT_ROLLBACKS
-- ============================================================================

CREATE TABLE deployment_rollbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL,
    rolled_back_to_deployment_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'success', 'failed')),
    reason TEXT,
    triggered_by TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
    FOREIGN KEY (rolled_back_to_deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployment_rollbacks_deployment_id ON deployment_rollbacks(deployment_id);
CREATE INDEX idx_deployment_rollbacks_status ON deployment_rollbacks(status);
