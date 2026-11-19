use russh::keys::PrivateKey;
use serde::Deserialize;
use sqlx::Row;
use tauri::AppHandle;
use ts_rs::TS;

use crate::crypto;
use crate::crypto::StrongholdVault;
use crate::helpers::open_read_only_pool;
use crate::params;
use crate::response::CommandResponse;
use crate::ssh::keys;
use crate::ssh::{connect_to_host_with_temp_credentials, open_command_channel, shell_escape, SshError, SshSession};

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
/// La conexión la gestiona `ssh/` con el mismo timeout y verificación de
/// huella que el resto de comandos. Las credenciales temporales se prueban
/// primero y, si fallan por autenticación, se reintentan las guardadas en BD.
#[tauri::command]
pub async fn export_public_key(
    app: AppHandle,
    input: ExportPublicKeyInput,
) -> Result<CommandResponse<()>, String> {
    // 1. Contexto de cifrado — vault de Stronghold (solo para la passkey).
    let vault = match StrongholdVault::open(&app) {
        Ok(v) => v,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.context_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Ruta de BD.
    let db_path = match crate::commands::database::store::get_database_path_internal(app.clone()) {
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

    // 3. Obtener, descifrar y convertir la passkey en línea de clave pública.
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

    if crypto::is_encrypted(&passkey.key_content) {
        passkey.key_content = vault
            .decrypt_value("encrypt:deployer_passkeys.key_content", &passkey.key_content)
            .map_err(|e| format!("Error al descifrar passkey: {}", e))?;
    }
    if let Some(ref pp) = passkey.passphrase {
        if crypto::is_encrypted(pp) {
            passkey.passphrase = Some(
                vault
                    .decrypt_value("encrypt:deployer_passkeys.passphrase", pp)
                    .map_err(|e| format!("Error al descifrar passphrase: {}", e))?,
            );
        }
    }

    let public_key_line = match extract_public_key(&passkey) {
        Ok(pk) => pk,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.passkeys.error.public_key_failed",
                params!("reason" => e),
            ))
        }
    };

    // 4. Conexión única a través de `ssh/` (timeout, credenciales y huella).
    let (mut session, _host) = match connect_to_host_with_temp_credentials(
        &app,
        input.host_id,
        0,
        false,
        input.temp_username.as_deref(),
        input.temp_password.as_deref(),
    )
    .await
    {
        Ok(connection) => connection,
        Err(e) => return Ok(CommandResponse::err(e.key, e.params)),
    };

    // 5. Operación sobre authorized_keys.
    let result = execute_authorized_keys(&mut session, &public_key_line, &input.action).await;
    session.disconnect().await;

    if let Err(e) = result {
        return Ok(CommandResponse::err(e.key, e.params));
    }

    let key = match input.action {
        ExportPublicKeyAction::Add => "tauri.passkeys.success.public_key_exported",
        ExportPublicKeyAction::Remove => "tauri.passkeys.success.public_key_removed",
    };
    Ok(CommandResponse::ok_empty(key))
}

// ---------------------------------------------------------------------------
// Operación sobre authorized_keys
// ---------------------------------------------------------------------------

/// Abre un canal SSH, ejecuta el comando sobre `~/.ssh/authorized_keys`.
async fn execute_authorized_keys(
    session: &mut SshSession,
    public_key_line: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), SshError> {
    let command = build_authorized_keys_command(public_key_line, action);
    run_channel_command(session, &command, action).await
}

/// Construye el comando shell para añadir o eliminar la clave de authorized_keys.
fn build_authorized_keys_command(public_key_line: &str, action: &ExportPublicKeyAction) -> String {
    let escaped = shell_escape(public_key_line);

    match action {
        ExportPublicKeyAction::Add => {
            format!(
                "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF {} ~/.ssh/authorized_keys || echo {} >> ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
        ExportPublicKeyAction::Remove => {
            format!(
                "if [ ! -f ~/.ssh/authorized_keys ]; then exit 1; fi; if ! grep -qxF {} ~/.ssh/authorized_keys; then exit 2; fi; grep -v -xF {} ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
    }
}

/// Ejecuta un comando en el canal SSH y espera su finalización.
async fn run_channel_command(
    session: &mut SshSession,
    command: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), SshError> {
    let mut channel = open_command_channel(session, command)
        .await
        .map_err(SshError::execution_failed)?;

    loop {
        match channel.wait().await {
            None => break,
            Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                if exit_status == 0 {
                    break;
                }

                if matches!(action, ExportPublicKeyAction::Remove) {
                    return match exit_status {
                        1 => Err(SshError::new(keys::AUTHORIZED_KEYS_NOT_FOUND)),
                        2 => Err(SshError::new(keys::PUBLIC_KEY_NOT_IN_AUTHORIZED_KEYS)),
                        _ => Err(SshError::execution_failed(format!(
                            "El comando SSH terminó con código de error: {}",
                            exit_status
                        ))),
                    };
                }

                return Err(SshError::execution_failed(format!(
                    "El comando SSH terminó con código de error: {}",
                    exit_status
                )));
            }
            Some(russh::ChannelMsg::ExitSignal { signal_name, .. }) => {
                return Err(SshError::execution_failed(format!(
                    "El comando SSH fue interrumpido por señal: {:?}",
                    signal_name
                )));
            }
            Some(_) => continue,
        }
    }

    channel.close().await.ok();
    Ok(())
}

// ---------------------------------------------------------------------------
// Helper de BD (solo passkey)
// ---------------------------------------------------------------------------

async fn fetch_passkey_data(db_path: &str, passkey_id: i64) -> Result<Option<PasskeyData>, String> {
    let pool = open_read_only_pool(db_path).await?;

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
