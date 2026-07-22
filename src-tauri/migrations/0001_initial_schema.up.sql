-- ============================================================================
-- Migration 1: Initial Database Schema
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
    distribution TEXT,
    system_info TEXT NOT NULL DEFAULT '{}',
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
    compose_content TEXT NOT NULL DEFAULT '',
    host_id INTEGER CONSTRAINT deployer_docker_composes_fk_host_id REFERENCES deployer_hosts (id) ON DELETE CASCADE,
    remote_path TEXT NOT NULL DEFAULT '/opt/docker-compose/docker-compose.yml',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX deployer_docker_composes_idx_name ON deployer_docker_composes (name);
CREATE INDEX deployer_docker_composes_idx_host_id ON deployer_docker_composes (host_id);
CREATE INDEX deployer_docker_composes_idx_enabled ON deployer_docker_composes (enabled);

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
    tag_name TEXT NOT NULL,
    last_updated TEXT,
    full_size INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deployer_docker_hub_tags_cache_uq_ns_repo_tag UNIQUE (namespace, repository, tag_name)
);

CREATE INDEX deployer_docker_hub_tags_cache_idx_ns_repo ON deployer_docker_hub_tags_cache (namespace, repository);
