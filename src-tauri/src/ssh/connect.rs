use sqlx::{Row, SqlitePool};
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;

use crate::commands::database::path_to_sqlite_url;
use crate::helpers::{configured_sqlite_options, open_crypto_context};
use crate::commands::database::store::get_database_path_internal;

use super::session::{decrypt_host_credentials, HostCredentials, SshSession};

/// Timeout para la conexión SSH (segundos).
const SSH_TIMEOUT_SECS: u64 = 15;

/// Conecta a un host por su ID, realizando todo el pipeline:
/// crypto context → SQL query (hosts + passkeys) → decrypt → SshSession::connect()
///
/// Si `enabled_only` es `true`, solo acepta hosts con `enabled = 1`.
/// Retorna la sesión SSH y las credenciales descifradas del host.
pub async fn connect_to_host_by_id(
    app: &AppHandle,
    host_id: i64,
    reconnect_attempts: u32,
    enabled_only: bool,
) -> Result<(SshSession, HostCredentials), String> {
    let (_pool, key) = open_crypto_context(app).await?;

    let db_path = get_database_path_internal(app.clone())
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?
        .ok_or_else(|| "Ruta de BD no configurada".to_string())?;

    let url = path_to_sqlite_url(&db_path);
    let options = configured_sqlite_options(&url)?;
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    let query = if enabled_only {
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
            h.system_info, h.status_info,
            h.created_at, h.updated_at,
            p.key_content, p.passphrase
        FROM deployer_hosts h
        LEFT JOIN deployer_passkeys p ON h.key_id = p.id
        WHERE h.id = ?1 AND h.enabled = 1
        "#
    } else {
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
            h.system_info, h.status_info,
            h.created_at, h.updated_at,
            p.key_content, p.passphrase
        FROM deployer_hosts h
        LEFT JOIN deployer_passkeys p ON h.key_id = p.id
        WHERE h.id = ?1
        "#
    };

    let row = sqlx::query(query)
        .bind(host_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;

    let row = row.ok_or_else(|| "Host no encontrado".to_string())?;

    let host_creds = HostCredentials {
        host: row.get("host"),
        port: row.get("port"),
        username: row.get("username"),
        auth_type: row.get("auth_type"),
        password: row.try_get("password").ok().flatten(),
    };

    let key_content: Option<String> = row.try_get("key_content").ok().flatten();
    let passphrase: Option<String> = row.try_get("passphrase").ok().flatten();

    let credentials = decrypt_host_credentials(&host_creds, key_content, passphrase, &key)?;
    let addr = format!("{}:{}", host_creds.host, host_creds.port);

    let session = timeout(
        Duration::from_secs(SSH_TIMEOUT_SECS),
        SshSession::connect(addr, credentials, reconnect_attempts),
    )
    .await
    .map_err(|_| "Timeout al conectar con el servidor SSH".to_string())?
    .map_err(|e| format!("Error de conexión SSH: {}", e))?;

    Ok((session, host_creds))
}
