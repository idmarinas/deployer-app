use russh::keys::PrivateKey;
use russh::Channel;
use serde::Deserialize;
use sqlx::{Row, SqlitePool};
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::helpers::configured_sqlite_options;
use crate::commands::hosts::types::{AuthType, Host};
use crate::commands::ssh::{SshCredentials, SshSession};
use crate::commands::CommandResponse;
use crate::crypto;
use crate::params;

/// Timeout para operaciones SSH (en segundos)
const SSH_TIMEOUT_SECS: u64 = 15;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct ExportPublicKeyInput {
    /// ID del host destino donde se exportará la clave pública.
    pub host_id: i64,
    /// ID de la passkey cuya clave pública se exportará.
    pub passkey_id: i64,
    /// Acción a realizar: añadir o eliminar la clave del authorized_keys.
    pub action: ExportPublicKeyAction,
    /// Credenciales temporales opcionales.
    pub temp_username: Option<String>,
    pub temp_password: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum ExportPublicKeyAction {
    Add,
    Remove,
}

// ---------------------------------------------------------------------------
// Estructuras internas
// ---------------------------------------------------------------------------

struct PasskeyData {
    key_content: String,
    passphrase: Option<String>,
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Añade o elimina una clave pública en `~/.ssh/authorized_keys` del host.
///
/// Flujo de autenticación (por orden de prioridad):
/// 1. Credenciales temporales proporcionadas en el input (temp_username + temp_password)
/// 2. Credenciales del host guardadas en BD
#[tauri::command]
pub async fn export_public_key(
    app: AppHandle,
    input: ExportPublicKeyInput,
) -> Result<CommandResponse<()>, String> {
    // 1. Contexto de cifrado
    let (_pool, master_key) = match crate::commands::helpers::open_crypto_context(&app).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.context_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Ruta de BD
    let db_path = match crate::commands::store::get_database_path_internal(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.no_database_path",
                params!(),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.store_error",
                params!("reason" => e),
            ))
        }
    };

    // 3. Obtener datos del host + credenciales de su passkey
    let (mut host, mut host_key_content, mut host_passphrase) =
        match fetch_host_data(&db_path, input.host_id).await {
            Ok(Some(data)) => data,
            Ok(None) => {
                return Ok(CommandResponse::err(
                    "tauri.hosts.error.not_found",
                    params!("id" => input.host_id.to_string()),
                ))
            }
            Err(e) => {
                return Ok(CommandResponse::err(
                    "tauri.hosts.error.database_error",
                    params!("reason" => e),
                ))
            }
        };

    // Descifrar credenciales del host
    if let Some(ref pwd) = host.password {
        if crypto::is_encrypted(pwd) {
            host.password = Some(
                crypto::decrypt(pwd, &master_key)
                    .map_err(|e| format!("Error al descifrar password: {}", e))?,
            );
        }
    }
    if let Some(ref kc) = host_key_content {
        if crypto::is_encrypted(kc) {
            host_key_content = Some(
                crypto::decrypt(kc, &master_key)
                    .map_err(|e| format!("Error al descifrar key_content: {}", e))?,
            );
        }
    }
    if let Some(ref pp) = host_passphrase {
        if crypto::is_encrypted(pp) {
            host_passphrase = Some(
                crypto::decrypt(pp, &master_key)
                    .map_err(|e| format!("Error al descifrar passphrase: {}", e))?,
            );
        }
    }

    // 4. Obtener datos de la passkey y descifrar
    let mut passkey = match fetch_passkey_data(&db_path, input.passkey_id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.error.not_found",
                params!("id" => input.passkey_id.to_string()),
            ))
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.database_error",
                params!("reason" => e),
            ))
        }
    };

    // Descifrar contenido de la passkey
    if crypto::is_encrypted(&passkey.key_content) {
        passkey.key_content = crypto::decrypt(&passkey.key_content, &master_key)
            .map_err(|e| format!("Error al descifrar passkey: {}", e))?;
    }
    if let Some(ref pp) = passkey.passphrase {
        if crypto::is_encrypted(pp) {
            passkey.passphrase = Some(
                crypto::decrypt(pp, &master_key)
                    .map_err(|e| format!("Error al descifrar passphrase: {}", e))?,
            );
        }
    }

    // 5. Obtener la clave pública desde la clave privada descifrada
    let public_key_line = match extract_public_key(&passkey) {
        Ok(pk) => pk,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.error.public_key_failed",
                params!("reason" => e),
            ))
        }
    };

    // 6. Intentar conexión SSH — primero credenciales temporales, luego las de BD
    let addr = format!("{}:{}", host.host, host.port);

    let connect_result = timeout(
        Duration::from_secs(SSH_TIMEOUT_SECS),
        try_connect_and_execute(
            &addr,
            &host,
            host_key_content.as_deref(),
            host_passphrase.as_deref(),
            input.temp_username.as_deref(),
            input.temp_password.as_deref(),
            &public_key_line,
            &input.action,
        ),
    )
    .await;

    match connect_result {
        Ok(Ok(())) => {
            let key = match input.action {
                ExportPublicKeyAction::Add => "tauri.passkeys.success.public_key_exported",
                ExportPublicKeyAction::Remove => "tauri.passkeys.success.public_key_removed",
            };
            Ok(CommandResponse::ok_empty(key))
        }
        Ok(Err(e)) => {
            if e.starts_with("tauri.") {
                Ok(CommandResponse::err(&e, params!()))
            } else {
                Ok(CommandResponse::err(
                    "tauri.hosts.error.connection_failed",
                    params!("reason" => e),
                ))
            }
        }
        Err(_) => Ok(CommandResponse::err(
            "tauri.hosts.error.connection_timeout",
            params!("timeout" => SSH_TIMEOUT_SECS.to_string()),
        )),
    }
}

// ---------------------------------------------------------------------------
// Conexión y ejecución SSH
// ---------------------------------------------------------------------------

/// Intenta conectarse al host y ejecutar la operación sobre authorized_keys.
///
/// Prueba primero las credenciales temporales (si se proporcionaron), y si
/// fallan o no se proporcionaron, usa las credenciales guardadas en BD.
async fn try_connect_and_execute(
    addr: &str,
    host: &Host,
    host_key_content: Option<&str>,
    host_passphrase: Option<&str>,
    temp_username: Option<&str>,
    temp_password: Option<&str>,
    public_key_line: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), String> {
    // Intentar con credenciales temporales si se proporcionaron
    if let (Some(user), Some(pass)) = (temp_username, temp_password) {
        if !user.is_empty() && !pass.is_empty() {
            let temp_creds = SshCredentials {
                username: user.to_string(),
                auth_type: AuthType::Password,
                password: Some(pass.to_string()),
                key_content: None,
                passphrase: None,
            };
            if let Ok(session) = SshSession::connect(addr.to_string(), temp_creds, 0).await {
                return execute_authorized_keys(session, public_key_line, action).await;
            }
        }
    }

    // Intentar con las credenciales guardadas en BD
    let credentials = SshCredentials {
        username: host.username.clone(),
        auth_type: host.auth_type.clone(),
        password: host.password.clone(),
        key_content: host_key_content.map(|s| s.to_string()),
        passphrase: host_passphrase.map(|s| s.to_string()),
    };
    let session = SshSession::connect(addr.to_string(), credentials, 0).await?;
    execute_authorized_keys(session, public_key_line, action).await
}

/// Abre un canal SSH, ejecuta el comando sobre `~/.ssh/authorized_keys`
/// y desconecta la sesión limpiamente.
async fn execute_authorized_keys(
    session: SshSession,
    public_key_line: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), String> {
    let channel = session
        .handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    let command = build_authorized_keys_command(public_key_line, action);

    run_channel_command(channel, &command, action).await?;

    session.disconnect().await;

    Ok(())
}

/// Construye el comando shell para añadir o eliminar la clave de authorized_keys.
fn build_authorized_keys_command(public_key_line: &str, action: &ExportPublicKeyAction) -> String {
    let escaped = public_key_line.replace('\'', "'\\''");

    match action {
        ExportPublicKeyAction::Add => {
            format!(
                "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '{}' ~/.ssh/authorized_keys || echo '{}' >> ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
        ExportPublicKeyAction::Remove => {
            format!(
                "if [ ! -f ~/.ssh/authorized_keys ]; then exit 1; fi; if ! grep -qxF '{}' ~/.ssh/authorized_keys; then exit 2; fi; grep -v -xF '{}' ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
    }
}

/// Ejecuta un comando en el canal SSH y espera su finalización.
async fn run_channel_command(
    mut channel: Channel<russh::client::Msg>,
    command: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), String> {
    channel
        .exec(true, command)
        .await
        .map_err(|e| format!("Error al ejecutar comando SSH: {}", e))?;

    loop {
        match channel.wait().await {
            None => break,
            Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                if exit_status == 0 {
                    break;
                }

                if matches!(action, ExportPublicKeyAction::Remove) {
                    return match exit_status {
                        1 => Err("tauri.passkeys.error.authorized_keys_not_found".to_string()),
                        2 => {
                            Err("tauri.passkeys.error.public_key_not_in_authorized_keys"
                                .to_string())
                        }
                        _ => Err(format!(
                            "El comando SSH terminó con código de error: {}",
                            exit_status
                        )),
                    };
                }

                return Err(format!(
                    "El comando SSH terminó con código de error: {}",
                    exit_status
                ));
            }
            Some(russh::ChannelMsg::ExitSignal { signal_name, .. }) => {
                return Err(format!(
                    "El comando SSH fue interrumpido por señal: {:?}",
                    signal_name
                ));
            }
            Some(_) => continue,
        }
    }

    channel.close().await.ok();
    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers de BD
// ---------------------------------------------------------------------------

async fn fetch_host_data(
    db_path: &str,
    host_id: i64,
) -> Result<Option<(Host, Option<String>, Option<String>)>, String> {
    let pool = open_pool(db_path).await?;

    let row = sqlx::query(
        r#"
        SELECT
            h.id, h.name, h.host, h.port, h.username, h.auth_type,
            h.password, h.key_id, h.description, h.enabled,
            h.system_info, h.status_info,
            h.created_at, h.updated_at,
            p.key_content, p.passphrase
        FROM deployer_hosts h
        LEFT JOIN deployer_passkeys p ON h.key_id = p.id
        WHERE h.id = ?
        "#,
    )
    .bind(host_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok(row.map(|r| {
        let host = Host {
            id: r.get("id"),
            name: r.get("name"),
            host: r.get("host"),
            port: r.get("port"),
            username: r.get("username"),
            auth_type: r.get("auth_type"),
            password: r.try_get("password").ok().flatten(),
            key_id: r.get("key_id"),
            description: r.try_get("description").ok().flatten(),
            enabled: r.get("enabled"),
            system_info: r.try_get("system_info").ok().flatten(),
            status_info: r.try_get("status_info").ok().flatten(),
            server_updates: r.try_get("server_updates").ok().flatten(),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        };
        let key_content: Option<String> = r.try_get("key_content").ok().flatten();
        let passphrase: Option<String> = r.try_get("passphrase").ok().flatten();
        (host, key_content, passphrase)
    }))
}

async fn fetch_passkey_data(db_path: &str, passkey_id: i64) -> Result<Option<PasskeyData>, String> {
    let pool = open_pool(db_path).await?;

    let row = sqlx::query("SELECT key_content, passphrase FROM deployer_passkeys WHERE id = ?")
        .bind(passkey_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok(row.map(|r| PasskeyData {
        key_content: r.get("key_content"),
        passphrase: r.get("passphrase"),
    }))
}

async fn open_pool(db_path: &str) -> Result<SqlitePool, String> {
    let url = path_to_sqlite_url(db_path);
    let options = configured_sqlite_options(&url)?.read_only(true);
    SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Helper de clave pública
// ---------------------------------------------------------------------------

fn extract_public_key(passkey: &PasskeyData) -> Result<String, String> {
    let private_key = PrivateKey::from_openssh(passkey.key_content.as_bytes())
        .map_err(|e| format!("Error al parsear la clave privada: {}", e))?;

    let private_key = if let Some(ref pp) = passkey.passphrase {
        match private_key.decrypt(pp.as_bytes()) {
            Ok(decrypted) => decrypted,
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("already decrypted") {
                    private_key
                } else {
                    return Err(format!(
                        "Error al descifrar la clave privada: {}",
                        error_msg
                    ));
                }
            }
        }
    } else {
        private_key
    };

    private_key
        .public_key()
        .to_openssh()
        .map_err(|e| format!("Error al serializar la clave pública: {}", e))
}
