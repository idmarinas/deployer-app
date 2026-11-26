use sqlx::{Row, SqlitePool};
use tauri::AppHandle;

use crate::helpers::open_pool;

use super::error::SshError;
use super::session::{decrypt_host_credentials, HostCredentials, SshCredentials, SshSession};

/// Conecta a un host por su ID usando las credenciales guardadas en BD.
///
/// Única entrada para todos los comandos que necesitan SSH: ejecución,
/// transferencias, test de conexión y exportación de clave pública.
pub async fn connect_to_host_by_id(
    app: &AppHandle,
    host_id: i64,
    reconnect_attempts: u32,
    enabled_only: bool,
) -> Result<(SshSession, HostCredentials), SshError> {
    connect_to_host(app, host_id, reconnect_attempts, enabled_only, None).await
}

/// Igual que `connect_to_host_by_id`, pero prueba primero unas credenciales
/// temporales de contraseña (las que el usuario introduce al exportar una
/// clave pública). Si fallan por autenticación se reintentan las de la BD;
/// si fallan por la clave del servidor no se reintenta: el host está en riesgo.
pub async fn connect_to_host_with_temp_credentials(
    app: &AppHandle,
    host_id: i64,
    reconnect_attempts: u32,
    enabled_only: bool,
    temp_username: Option<&str>,
    temp_password: Option<&str>,
) -> Result<(SshSession, HostCredentials), SshError> {
    let temp = match (temp_username, temp_password) {
        (Some(user), Some(pass)) if !user.is_empty() && !pass.is_empty() => Some((user, pass)),
        _ => None,
    };

    connect_to_host(app, host_id, reconnect_attempts, enabled_only, temp).await
}

async fn connect_to_host(
    app: &AppHandle,
    host_id: i64,
    reconnect_attempts: u32,
    enabled_only: bool,
    temp_credentials: Option<(&str, &str)>,
) -> Result<(SshSession, HostCredentials), SshError> {
    let (pool, _path) = open_pool(app)
        .await
        .map_err(|e| SshError::connection_failed(format!("Error al abrir pool: {}", e)))?;

    let vault = crate::crypto::StrongholdVault::open(app).map_err(|e| {
        SshError::connection_failed(format!("Error al abrir vault de Stronghold: {}", e))
    })?;

    let row = fetch_host_credentials(&pool, host_id, enabled_only).await?;

    pool.close().await;

    let (host_creds, key_content, passphrase, expected_fingerprint) = row.ok_or_else(|| {
        SshError::with_param("tauri.hosts.error.not_found", "id", host_id.to_string())
    })?;

    let saved_credentials = decrypt_host_credentials(&host_creds, key_content, passphrase, &vault)
        .map_err(SshError::connection_failed)?;

    let addr = format!("{}:{}", host_creds.host, host_creds.port);

    if let Some((username, password)) = temp_credentials {
        let temporary = SshCredentials {
            username: username.to_string(),
            auth_type: crate::commands::hosts::types::AuthType::Password,
            password: Some(password.to_string()),
            key_content: None,
            passphrase: None,
        };

        match SshSession::connect(
            addr.clone(),
            temporary,
            reconnect_attempts,
            expected_fingerprint.clone(),
        )
        .await
        {
            Ok(session) => return Ok((session, host_creds)),
            Err(e) if e.is_host_key() => return Err(e),
            Err(_) => { /* se reintenta con las credenciales guardadas */ }
        }
    }

    let session = SshSession::connect(
        addr,
        saved_credentials,
        reconnect_attempts,
        expected_fingerprint,
    )
    .await?;

    Ok((session, host_creds))
}

/// Fila mínima de host + passkey necesaria para autenticar por SSH.
pub(crate) type HostCredentialRow = (
    HostCredentials,
    Option<String>,
    Option<String>,
    Option<String>,
);

/// Obtiene las credenciales cifradas de un host, de su passkey asociada y la
/// huella de su clave del servidor ya confirmada (si la hay).
pub(crate) async fn fetch_host_credentials(
    pool: &SqlitePool,
    host_id: i64,
    enabled_only: bool,
) -> Result<Option<HostCredentialRow>, SshError> {
    let query = if enabled_only {
        "SELECT h.host, h.port, h.username, h.auth_type, h.password, \
                h.host_key_fingerprint, p.key_content, p.passphrase \
         FROM deployer_hosts h LEFT JOIN deployer_passkeys p ON h.key_id = p.id \
         WHERE h.id = ?1 AND h.enabled = 1"
    } else {
        "SELECT h.host, h.port, h.username, h.auth_type, h.password, \
                h.host_key_fingerprint, p.key_content, p.passphrase \
         FROM deployer_hosts h LEFT JOIN deployer_passkeys p ON h.key_id = p.id \
         WHERE h.id = ?1"
    };

    let row = sqlx::query(query)
        .bind(host_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| SshError::connection_failed(format!("Error al consultar el host: {}", e)))?;

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
        let host_key_fingerprint: Option<String> = r
            .try_get("host_key_fingerprint")
            .ok()
            .flatten()
            .filter(|value: &String| !value.is_empty());
        (host_creds, key_content, passphrase, host_key_fingerprint)
    }))
}
