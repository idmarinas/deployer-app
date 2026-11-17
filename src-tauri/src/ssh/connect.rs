use sqlx::{Row, SqlitePool};
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;

use crate::helpers::open_pool;

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
    let (pool, _path) = open_pool(app).await.map_err(|e| format!("Error al abrir pool: {}", e))?;

    let vault = crate::crypto::StrongholdVault::open(app)
        .map_err(|e| format!("Error al abrir vault de Stronghold: {}", e))?;

    let row = fetch_host_credentials(&pool, host_id, enabled_only).await?;

    pool.close().await;

    let (host_creds, key_content, passphrase) =
        row.ok_or_else(|| "Host no encontrado".to_string())?;

    let credentials = decrypt_host_credentials(&host_creds, key_content, passphrase, &vault)?;
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

/// Fila mínima de host + passkey necesaria para autenticar por SSH.
pub(crate) type HostCredentialRow = (HostCredentials, Option<String>, Option<String>);

/// Obtiene las credenciales cifradas de un host y de su passkey asociada.
///
/// Compartido por `connect_to_host_by_id` y `export_public_key` para no duplicar
/// el SELECT del host con JOIN a passkeys.
pub(crate) async fn fetch_host_credentials(
    pool: &SqlitePool,
    host_id: i64,
    enabled_only: bool,
) -> Result<Option<HostCredentialRow>, String> {
    let query = if enabled_only {
        "SELECT h.host, h.port, h.username, h.auth_type, h.password, \
                p.key_content, p.passphrase \
         FROM deployer_hosts h LEFT JOIN deployer_passkeys p ON h.key_id = p.id \
         WHERE h.id = ?1 AND h.enabled = 1"
    } else {
        "SELECT h.host, h.port, h.username, h.auth_type, h.password, \
                p.key_content, p.passphrase \
         FROM deployer_hosts h LEFT JOIN deployer_passkeys p ON h.key_id = p.id \
         WHERE h.id = ?1"
    };

    let row = sqlx::query(query)
        .bind(host_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(row.map(|r| {
        let host_creds = HostCredentials {
            host: r.get("host"),
            port: r.get("port"),
            username: r.get("username"),
            auth_type: r.get("auth_type"),
            password: r.try_get("password").ok().flatten(),
        };
        let key_content: Option<String> = r.try_get("key_content").ok().flatten();
        let passphrase: Option<String> = r.try_get("passphrase").ok().flatten();
        (host_creds, key_content, passphrase)
    }))
}
