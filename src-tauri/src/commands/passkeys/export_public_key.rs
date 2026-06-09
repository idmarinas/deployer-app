use russh::client;
use russh::keys::{PrivateKey, PrivateKeyWithHashAlg};
use russh::Channel;
use serde::Deserialize;
use sqlx::{sqlite::SqliteConnectOptions, Row, SqlitePool};
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tauri::State;
use tokio::time::timeout;
use ts_rs::TS;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::hosts::types::AuthType;
use crate::commands::passkeys::helpers::open_crypto_context;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use crate::crypto;
use crate::db::EncryptionConfigCache;
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
    /// Credenciales temporales opcionales. Se usan cuando el host no tiene
    /// credenciales guardadas en BD que funcionen (ej: host con auth por key
    /// pero la passkey aún no está en el servidor).
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

struct HostData {
    host: String,
    port: i64,
    username: String,
    auth_type: AuthType,
    password: Option<String>,
    key_content: Option<String>,
    passphrase: Option<String>,
}

struct PasskeyData {
    key_content: String,
    passphrase: Option<String>,
}

struct SshClientHandler;

impl client::Handler for SshClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Añade o elimina una clave pública en `~/.ssh/authorized_keys` del host.
///
/// Flujo de autenticación (por orden de prioridad):
/// 1. Credenciales temporales proporcionadas en el input (temp_username + temp_password)
/// 2. Credenciales del host guardadas en BD
///
/// Si ninguna funciona, devuelve error con mensaje descriptivo.
#[tauri::command]
pub async fn export_public_key(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    input: ExportPublicKeyInput,
) -> Result<CommandResponse<()>, String> {
    // 1. Contexto de cifrado
    let (_pool, _cache, master_key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "tauri.hosts.error.context_failed",
                params!("reason" => e),
            ));
        }
    };

    // 2. Ruta de BD
    let db_path = match get_database_path_internal(app) {
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

    // 3. Obtener datos del host y descifrar credenciales
    let mut host = match fetch_host_data(&db_path, input.host_id).await {
        Ok(Some(h)) => h,
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

    decrypt_host_credentials(&mut host, &master_key)?;

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

    decrypt_passkey_credentials(&mut passkey, &master_key)?;

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
            addr,
            &host,
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
            // Si el error es una clave de localización (comienza con "tauri."),
            // devolverlo directamente sin envolverlo en connection_failed
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
    addr: String,
    host: &HostData,
    temp_username: Option<&str>,
    temp_password: Option<&str>,
    public_key_line: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), String> {
    let config = Arc::new(client::Config::default());

    // Intentar con credenciales temporales si se proporcionaron
    if let (Some(user), Some(pass)) = (temp_username, temp_password) {
        if !user.is_empty() && !pass.is_empty() {
            match connect_with_password(&addr, config.clone(), user, pass).await {
                Ok(session) => {
                    return execute_authorized_keys(session, public_key_line, action).await;
                }
                Err(_) => {
                    // Las credenciales temporales fallaron, continuar con las de BD
                }
            }
        }
    }

    // Intentar con las credenciales guardadas en BD
    let session = connect_with_host_credentials(&addr, config, host).await?;
    execute_authorized_keys(session, public_key_line, action).await
}

/// Conecta usando usuario + contraseña.
async fn connect_with_password(
    addr: &str,
    config: Arc<client::Config>,
    username: &str,
    password: &str,
) -> Result<client::Handle<SshClientHandler>, String> {
    let mut session = client::connect(config, addr, SshClientHandler)
        .await
        .map_err(|e| e.to_string())?;

    let result = session
        .authenticate_password(username, password)
        .await
        .map_err(|e| e.to_string())?;

    if !matches!(result, russh::client::AuthResult::Success) {
        return Err("Autenticación por contraseña rechazada".to_string());
    }

    Ok(session)
}

/// Conecta usando las credenciales guardadas en BD (password o key).
async fn connect_with_host_credentials(
    addr: &str,
    config: Arc<client::Config>,
    host: &HostData,
) -> Result<client::Handle<SshClientHandler>, String> {
    let mut session = client::connect(config, addr, SshClientHandler)
        .await
        .map_err(|e| e.to_string())?;

    let result = match host.auth_type {
        AuthType::Password => {
            let password = host.password.clone().unwrap_or_default();
            session
                .authenticate_password(&host.username, password)
                .await
                .map_err(|e| e.to_string())?
        }
        AuthType::Key => {
            let key_content = host.key_content.as_ref().ok_or_else(|| {
                "No se encontró el contenido de la clave privada del host".to_string()
            })?;

            let private_key = PrivateKey::from_openssh(key_content.as_bytes())
                .map_err(|e| format!("Error al procesar la clave privada: {}", e))?;

            let private_key = if let Some(ref pp) = host.passphrase {
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

            let key_with_hash = PrivateKeyWithHashAlg::new(Arc::new(private_key), None);

            session
                .authenticate_publickey(&host.username, key_with_hash)
                .await
                .map_err(|e| e.to_string())?
        }
    };

    if !matches!(result, russh::client::AuthResult::Success) {
        return Err("Autenticación rechazada por el servidor".to_string());
    }

    Ok(session)
}

/// Abre un canal SSH, ejecuta el comando sobre `~/.ssh/authorized_keys`
/// y desconecta la sesión limpiamente.
async fn execute_authorized_keys(
    session: client::Handle<SshClientHandler>,
    public_key_line: &str,
    action: &ExportPublicKeyAction,
) -> Result<(), String> {
    let channel = session
        .channel_open_session()
        .await
        .map_err(|e| format!("Error al abrir canal SSH: {}", e))?;

    let command = build_authorized_keys_command(public_key_line, action);

    run_channel_command(channel, &command, action).await?;

    session
        .disconnect(
            russh::Disconnect::ByApplication,
            "Operación completada",
            "en",
        )
        .await
        .ok();

    Ok(())
}

/// Construye el comando shell para añadir o eliminar la clave de authorized_keys.
fn build_authorized_keys_command(public_key_line: &str, action: &ExportPublicKeyAction) -> String {
    let escaped = public_key_line.replace('\'', "'\\''");

    match action {
        ExportPublicKeyAction::Add => {
            // Crea el directorio y el archivo si no existen, luego añade la clave
            // solo si no está ya presente (evita duplicados).
            format!(
                "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '{}' ~/.ssh/authorized_keys || echo '{}' >> ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
        ExportPublicKeyAction::Remove => {
            // Script para eliminar la clave con códigos de salida específicos:
            // 0: clave eliminada correctamente
            // 1: archivo ~/.ssh/authorized_keys no existe
            // 2: archivo existe pero la clave no está presente
            // Otros: error durante la operación
            format!(
                "if [ ! -f ~/.ssh/authorized_keys ]; then exit 1; fi; if ! grep -qxF '{}' ~/.ssh/authorized_keys; then exit 2; fi; grep -v -xF '{}' ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
                escaped, escaped
            )
        }
    }
}

/// Ejecuta un comando en el canal SSH y espera su finalización.
/// Para operaciones Remove, interpreta códigos de salida específicos:
/// - 0: éxito
/// - 1: archivo ~/.ssh/authorized_keys no existe
/// - 2: la clave pública no está en el archivo
/// - Otros: error genérico
async fn run_channel_command(
    mut channel: Channel<client::Msg>,
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

                // Interpretar códigos de salida específicos para Remove
                if matches!(action, ExportPublicKeyAction::Remove) {
                    return match exit_status {
                        1 => Err("tauri.passkeys.error.authorized_keys_not_found".to_string()),
                        2 => Err("tauri.passkeys.error.public_key_not_in_authorized_keys".to_string()),
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

async fn fetch_host_data(db_path: &str, host_id: i64) -> Result<Option<HostData>, String> {
    let pool = open_pool(db_path).await?;

    let row = sqlx::query(
        r#"
        SELECT
            h.host, h.port, h.username, h.auth_type, h.password,
            p.key_content, p.passphrase
        FROM hosts h
        LEFT JOIN passkeys p ON h.key_id = p.id
        WHERE h.id = ?
        "#,
    )
    .bind(host_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok(row.map(|r| HostData {
        host: r.get("host"),
        port: r.get("port"),
        username: r.get("username"),
        auth_type: r.get("auth_type"),
        password: r.get("password"),
        key_content: r.get("key_content"),
        passphrase: r.get("passphrase"),
    }))
}

async fn fetch_passkey_data(db_path: &str, passkey_id: i64) -> Result<Option<PasskeyData>, String> {
    let pool = open_pool(db_path).await?;

    let row = sqlx::query("SELECT key_content, passphrase FROM passkeys WHERE id = ?")
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

/// Abre un pool SQLite en modo lectura.
async fn open_pool(db_path: &str) -> Result<SqlitePool, String> {
    let url = path_to_sqlite_url(db_path);
    let options = SqliteConnectOptions::from_str(&url)
        .map_err(|e| e.to_string())?
        .read_only(true);
    SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Helpers de descifrado
// ---------------------------------------------------------------------------

fn decrypt_host_credentials(host: &mut HostData, key: &[u8]) -> Result<(), String> {
    decrypt_field(&mut host.password, key, "password del host")?;
    decrypt_field(&mut host.key_content, key, "clave privada del host")?;
    decrypt_field(&mut host.passphrase, key, "passphrase del host")?;
    Ok(())
}

fn decrypt_passkey_credentials(passkey: &mut PasskeyData, key: &[u8]) -> Result<(), String> {
    decrypt_field_required(&mut passkey.key_content, key, "contenido de la passkey")?;
    decrypt_field(&mut passkey.passphrase, key, "passphrase de la passkey")?;
    Ok(())
}

/// Descifra un campo `Option<String>` en su lugar si tiene el prefijo `ENC:`.
fn decrypt_field(field: &mut Option<String>, key: &[u8], label: &str) -> Result<(), String> {
    if let Some(ref val) = field.clone() {
        if crypto::is_encrypted(val) {
            *field = Some(
                crypto::decrypt(val, key)
                    .map_err(|e| format!("Error al descifrar {}: {}", label, e))?,
            );
        }
    }
    Ok(())
}

/// Descifra un campo `String` en su lugar si tiene el prefijo `ENC:`.
fn decrypt_field_required(field: &mut String, key: &[u8], label: &str) -> Result<(), String> {
    if crypto::is_encrypted(field) {
        *field = crypto::decrypt(field, key)
            .map_err(|e| format!("Error al descifrar {}: {}", label, e))?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Helper de clave pública
// ---------------------------------------------------------------------------

/// Extrae la clave pública en formato OpenSSH desde la clave privada de la passkey.
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
