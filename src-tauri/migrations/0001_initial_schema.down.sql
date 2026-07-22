-- ============================================================================
-- Migration 1 Down: Drop all tables
-- ============================================================================

DROP TRIGGER IF EXISTS deployer_settings_trg_set_updated_at;
DROP TRIGGER IF EXISTS deployer_passkeys_trg_set_updated_at;
DROP TRIGGER IF EXISTS deployer_hosts_trg_set_updated_at;
DROP TRIGGER IF EXISTS deployer_docker_composes_trg_set_updated_at;

DROP TABLE IF EXISTS deployer_docker_hub_tags_cache;
DROP TABLE IF EXISTS deployer_docker_hub_search_cache;
DROP TABLE IF EXISTS deployer_docker_composes;
DROP TABLE IF EXISTS deployer_hosts;
DROP TABLE IF EXISTS deployer_passkeys;
DROP TABLE IF EXISTS deployer_settings;
