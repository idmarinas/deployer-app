-- ============================================================================
-- Migration 1: Initial Database Schema
-- Version: 0.1.0
-- Módulos: Deployer Settings, Passkeys, Hosts, Docker Composes, Docker Hub Cache
-- Todas las tablas de la app llevan prefijo deployer_*
-- ============================================================================

-- ============================================================================
-- DEPLOYER SETTINGS
-- ============================================================================

CREATE TABLE deployer_settings (
    key TEXT CONSTRAINT deployer_settings_pk PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DEPLOYER PASSKEYS (SSH Keys)
-- ============================================================================

CREATE TABLE deployer_passkeys (
    id INTEGER CONSTRAINT deployer_passkeys_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT deployer_passkeys_uq_name UNIQUE,
    key_content TEXT NOT NULL,
    passphrase TEXT,
    key_type TEXT CONSTRAINT deployer_passkeys_chk_key_type CHECK (key_type IN ('rsa', 'ed25519', 'ecdsa')),
    fingerprint TEXT,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DEPLOYER HOSTS
-- ============================================================================

CREATE TABLE deployer_hosts (
    id INTEGER CONSTRAINT deployer_hosts_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT deployer_hosts_uq_name UNIQUE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL DEFAULT '',
    auth_type TEXT NOT NULL CONSTRAINT deployer_hosts_chk_auth_type CHECK (auth_type IN ('password', 'key')),
    password TEXT,
    key_id INTEGER CONSTRAINT deployer_hosts_fk_key_id REFERENCES deployer_passkeys (id) ON DELETE SET NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    system_info TEXT NOT NULL DEFAULT '{}',
    status_info TEXT NOT NULL DEFAULT '{}',
    server_updates TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_hosts_idx_enabled ON deployer_hosts (enabled);

CREATE INDEX deployer_hosts_idx_key_id ON deployer_hosts (key_id);

-- ============================================================================
-- DEPLOYER DOCKER COMPOSES
-- ============================================================================

CREATE TABLE deployer_docker_composes (
    id INTEGER CONSTRAINT deployer_docker_composes_pk PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CONSTRAINT deployer_docker_composes_uq_name UNIQUE,
    description TEXT,
    host_id INTEGER CONSTRAINT deployer_docker_composes_fk_host_id REFERENCES deployer_hosts (id) ON DELETE CASCADE,
    remote_path TEXT NOT NULL DEFAULT '/opt/docker-compose/',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_docker_composes_idx_name ON deployer_docker_composes (name);
CREATE INDEX deployer_docker_composes_idx_host_id ON deployer_docker_composes (host_id);
CREATE INDEX deployer_docker_composes_idx_enabled ON deployer_docker_composes (enabled);

-- ============================================================================
-- DEPLOYER DOCKER COMPOSE FILES (archivos de cada compose)
-- ============================================================================

CREATE TABLE deployer_docker_compose_files (
    id INTEGER CONSTRAINT deployer_docker_compose_files_pk PRIMARY KEY AUTOINCREMENT,
    docker_compose_id INTEGER NOT NULL CONSTRAINT deployer_docker_compose_files_fk_compose_id REFERENCES deployer_docker_composes (id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    content TEXT,
    is_binary BOOLEAN NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_docker_compose_files_idx_compose_id ON deployer_docker_compose_files (docker_compose_id);
CREATE INDEX deployer_docker_compose_files_idx_file_path ON deployer_docker_compose_files (file_path);

-- ============================================================================
-- TRIGGERS: actualización automática de `updated_at`
-- ============================================================================

CREATE TRIGGER deployer_settings_trg_set_updated_at
AFTER UPDATE ON deployer_settings
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = OLD.key;
END;

CREATE TRIGGER deployer_passkeys_trg_set_updated_at
AFTER UPDATE ON deployer_passkeys
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_passkeys SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER deployer_hosts_trg_set_updated_at
AFTER UPDATE ON deployer_hosts
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_hosts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER deployer_docker_composes_trg_set_updated_at
AFTER UPDATE ON deployer_docker_composes
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_docker_composes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER deployer_docker_compose_files_trg_set_updated_at
AFTER UPDATE ON deployer_docker_compose_files
WHEN NEW.updated_at = OLD.updated_at
BEGIN
UPDATE deployer_docker_compose_files SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- DEPLOYER DOCKER HUB CACHE - Búsquedas de imágenes
-- ============================================================================

CREATE TABLE deployer_docker_hub_search_cache (
    id INTEGER CONSTRAINT deployer_docker_hub_search_cache_pk PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    namespace TEXT NOT NULL,
    repository TEXT NOT NULL,
    description TEXT,
    pull_count INTEGER NOT NULL DEFAULT 0,
    star_count INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deployer_docker_hub_search_cache_uq_query_ns_repo UNIQUE (query, namespace, repository)
);

CREATE INDEX deployer_docker_hub_search_cache_idx_query ON deployer_docker_hub_search_cache (query);

-- ============================================================================
-- DEPLOYER DOCKER HUB CACHE - Tags de imágenes
-- ============================================================================

CREATE TABLE deployer_docker_hub_tags_cache (
    id INTEGER CONSTRAINT deployer_docker_hub_tags_cache_pk PRIMARY KEY AUTOINCREMENT,
    namespace TEXT NOT NULL,
    repository TEXT NOT NULL,
    url_query TEXT NOT NULL,
    url_next TEXT,
    url_previous TEXT,
    count INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL,
    tags_versions TEXT NOT NULL,
    tags_variants TEXT NOT NULL,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deployer_docker_hub_tags_cache_uq_ns_repo_query UNIQUE (namespace, repository, url_query)
);

CREATE INDEX deployer_docker_hub_tags_cache_idx_ns_repo ON deployer_docker_hub_tags_cache (namespace, repository);
