-- ============================================================================
-- Migration 1: Initial Database Schema
-- ============================================================================

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

CREATE TABLE app_settings (
    key TEXT CONSTRAINT app_settings_pk PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================================
-- PASSKEYS (SSH Keys)
-- ============================================================================

CREATE TABLE passkeys (
    id INTEGER CONSTRAINT passkeys_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT passkeys_uq_name UNIQUE,
    key_content TEXT NOT NULL,
    passphrase TEXT,
    key_type TEXT CONSTRAINT passkeys_chk_key_type CHECK (
        key_type IN ('rsa', 'ed25519', 'ecdsa')
    ),
    fingerprint TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HOSTS
-- ============================================================================

CREATE TABLE hosts (
    id INTEGER CONSTRAINT hosts_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT hosts_uq_name UNIQUE,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT NOT NULL CONSTRAINT hosts_chk_auth_type CHECK (
        auth_type IN ('password', 'key')
    ),
    password TEXT,
    key_id INTEGER CONSTRAINT hosts_fk_key_id REFERENCES passkeys (id) ON DELETE SET NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX hosts_idx_enabled ON hosts (enabled);

CREATE INDEX hosts_idx_key_id ON hosts (key_id);

-- ============================================================================
-- GLOBAL VARIABLES
-- ============================================================================

CREATE TABLE global_variables (
    id INTEGER CONSTRAINT global_variables_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT global_variables_uq_name UNIQUE,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX global_variables_idx_name ON global_variables (name);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
    id INTEGER CONSTRAINT projects_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT projects_uq_name UNIQUE,
    description TEXT,
    repository_url TEXT,
    framework TEXT CONSTRAINT projects_chk_framework CHECK (
        framework IN (
            'symfony',
            'laravel',
            'nextjs',
            'generic'
        )
    ),
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX projects_idx_name ON projects (name);

CREATE INDEX projects_idx_enabled ON projects (enabled);

-- ============================================================================
-- PROJECT_HOSTS (N:N Relation)
-- ============================================================================

CREATE TABLE project_hosts (
    id INTEGER CONSTRAINT project_hosts_pk PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL CONSTRAINT project_hosts_fk_project_id REFERENCES projects (id) ON DELETE CASCADE,
    host_id INTEGER NOT NULL CONSTRAINT project_hosts_fk_host_id REFERENCES hosts (id) ON DELETE CASCADE,
    deploy_order INTEGER,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_hosts_uq_project_id_host_id UNIQUE (project_id, host_id)
);

CREATE INDEX project_hosts_idx_project_id ON project_hosts (project_id);

CREATE INDEX project_hosts_idx_host_id ON project_hosts (host_id);

CREATE INDEX project_hosts_idx_deploy_order ON project_hosts (deploy_order);

-- ============================================================================
-- PROJECT_VARIABLES
-- ============================================================================

CREATE TABLE project_variables (
    id INTEGER CONSTRAINT project_variables_pk PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL CONSTRAINT project_variables_fk_project_id REFERENCES projects (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_variables_uq_project_id_name UNIQUE (project_id, name)
);

CREATE INDEX project_variables_idx_project_id ON project_variables (project_id);

CREATE INDEX project_variables_idx_name ON project_variables (name);

-- ============================================================================
-- FRAMEWORK_CONFIGS (Generic, flexible configuration)
-- ============================================================================

CREATE TABLE framework_configs (
    id INTEGER CONSTRAINT framework_configs_pk PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL CONSTRAINT framework_configs_fk_project_id REFERENCES projects (id) ON DELETE CASCADE,
    framework TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT 0,
    data_type TEXT DEFAULT 'string' CONSTRAINT framework_configs_chk_data_type CHECK (
        data_type IN (
            'string',
            'integer',
            'boolean',
            'json'
        )
    ),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT framework_configs_uq_project_id_framework_key UNIQUE (project_id, framework, key)
);

CREATE INDEX framework_configs_idx_project_id ON framework_configs (project_id);

CREATE INDEX framework_configs_idx_framework ON framework_configs (framework);

CREATE INDEX framework_configs_idx_key ON framework_configs (key);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE tasks (
    id INTEGER CONSTRAINT tasks_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT tasks_uq_name UNIQUE,
    description TEXT,
    type TEXT NOT NULL CONSTRAINT tasks_chk_type CHECK (
        type IN (
            'command',
            'upload_file',
            'download_file',
            'script'
        )
    ),
    command TEXT,
    working_dir TEXT,
    timeout INTEGER DEFAULT 300,
    retry_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT 1,
    is_global BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tasks_idx_name ON tasks (name);

CREATE INDEX tasks_idx_enabled ON tasks (enabled);

CREATE INDEX tasks_idx_is_global ON tasks (is_global);

-- ============================================================================
-- PROJECT_TASKS (N:N Relation)
-- ============================================================================

CREATE TABLE project_tasks (
    id INTEGER CONSTRAINT project_tasks_pk PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL CONSTRAINT project_tasks_fk_project_id REFERENCES projects (id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL CONSTRAINT project_tasks_fk_task_id REFERENCES tasks (id) ON DELETE CASCADE,
    order_execution INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    condition TEXT,
    on_failure TEXT DEFAULT 'stop' CONSTRAINT project_tasks_chk_on_failure CHECK (
        on_failure IN ('stop', 'continue', 'retry')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_tasks_uq_project_id_task_id_order UNIQUE (
        project_id,
        task_id,
        order_execution
    )
);

CREATE INDEX project_tasks_idx_project_id ON project_tasks (project_id);

CREATE INDEX project_tasks_idx_task_id ON project_tasks (task_id);

CREATE INDEX project_tasks_idx_order_execution ON project_tasks (order_execution);

-- ============================================================================
-- TASK_DEPENDENCIES
-- ============================================================================

CREATE TABLE task_dependencies (
    id INTEGER CONSTRAINT task_dependencies_pk PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL CONSTRAINT task_dependencies_fk_task_id REFERENCES project_tasks (id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL CONSTRAINT task_dependencies_fk_depends_on_task_id REFERENCES project_tasks (id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'success' CONSTRAINT task_dependencies_chk_dependency_type CHECK (
        dependency_type IN (
            'success',
            'failure',
            'always'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_dependencies_uq_task_id_depends_on_task_id UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX task_dependencies_idx_task_id ON task_dependencies (task_id);

CREATE INDEX task_dependencies_idx_depends_on_task_id ON task_dependencies (depends_on_task_id);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================

CREATE TABLE deployments (
    id INTEGER CONSTRAINT deployments_pk PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL CONSTRAINT deployments_fk_project_id REFERENCES projects (id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    tag TEXT NOT NULL,
    build INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CONSTRAINT deployments_chk_status CHECK (
        status IN (
            'pending',
            'running',
            'success',
            'failed'
        )
    ),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_seconds INTEGER,
    triggered_by TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployments_idx_project_id ON deployments (project_id);

CREATE INDEX deployments_idx_status ON deployments (status);

CREATE INDEX deployments_idx_version ON deployments (version);

CREATE INDEX deployments_idx_created_at ON deployments (created_at);

-- ============================================================================
-- DEPLOYMENT_EXECUTIONS
-- ============================================================================

CREATE TABLE deployment_executions (
    id INTEGER CONSTRAINT deployment_executions_pk PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL CONSTRAINT deployment_executions_fk_deployment_id REFERENCES deployments (id) ON DELETE CASCADE,
    host_id INTEGER NOT NULL CONSTRAINT deployment_executions_fk_host_id REFERENCES hosts (id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL CONSTRAINT deployment_executions_fk_task_id REFERENCES project_tasks (id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CONSTRAINT deployment_executions_chk_status CHECK (
        status IN (
            'pending',
            'running',
            'success',
            'failed',
            'skipped'
        )
    ),
    exit_code INTEGER,
    output TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_seconds INTEGER,
    retry_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployment_executions_idx_deployment_id ON deployment_executions (deployment_id);

CREATE INDEX deployment_executions_idx_host_id ON deployment_executions (host_id);

CREATE INDEX deployment_executions_idx_task_id ON deployment_executions (task_id);

CREATE INDEX deployment_executions_idx_status ON deployment_executions (status);

-- ============================================================================
-- DEPLOYMENT_ROLLBACKS
-- ============================================================================

CREATE TABLE deployment_rollbacks (
    id INTEGER CONSTRAINT deployment_rollbacks_pk PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL CONSTRAINT deployment_rollbacks_fk_deployment_id REFERENCES deployments (id) ON DELETE CASCADE,
    rolled_back_to_deployment_id INTEGER NOT NULL CONSTRAINT deployment_rollbacks_fk_rolled_back_to_deployment_id REFERENCES deployments (id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CONSTRAINT deployment_rollbacks_chk_status CHECK (
        status IN (
            'pending',
            'running',
            'success',
            'failed'
        )
    ),
    reason TEXT,
    triggered_by TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployment_rollbacks_idx_deployment_id ON deployment_rollbacks (deployment_id);

CREATE INDEX deployment_rollbacks_idx_status ON deployment_rollbacks (status);