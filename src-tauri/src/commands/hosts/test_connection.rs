use russh::client;
use russh::keys::{PrivateKey, PrivateKeyWithHashAlg};
use sqlx::{sqlite::SqliteConnectOptions, Row, SqlitePool};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tokio::time::timeout;

use crate::commands::database::path_to_sqlite_url;
use crate::commands::store::get_database_path_internal;
use crate::commands::CommandResponse;
use crate::params;

use tauri::State;
use crate::db::EncryptionConfigCache;
use crate::commands::hosts::helpers::open_crypto_context;
use crate::crypto;

/// Timeout por defecto para la conexión SSH (en segundos)
const CONNECTION_TIMEOUT_SECS: u64 = 10;

// ---------------------------------------------------------------------------
// Estructuras internas
// ---------------------------------------------------------------------------

/// Datos del host obtenidos de la base de datos, junto con la clave si aplica.
struct HostData {
    host: String,
    port: i64,
    username: String,
    auth_type: String,
    password: Option<String>,
    key_content: Option<String>,
    passphrase: Option<String>,
}

/// Handler SSH mínimo: acepta cualquier clave de servidor durante la verificación
/// de conexión. Para la fase de test no se valida el fingerprint del servidor.
struct SshClientHandler;

impl client::Handler for SshClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        // Aceptamos cualquier clave del servidor en la prueba de conexión.
        Ok(true)
    }
}

// ---------------------------------------------------------------------------
// Comando Tauri
// ---------------------------------------------------------------------------

/// Comprueba si es posible establecer una conexión SSH con el host indicado.
///
/// Obtiene los datos de conexión directamente desde la base de datos SQLite
/// (incluyendo credenciales y clave privada si `auth_type = 'key'`).
///
/// Devuelve `success: true` si la autenticación fue exitosa, o
/// `success: false` con un mensaje descriptivo en caso de error.
#[tauri::command]
pub async fn test_connection(
    app: AppHandle,
    cache: State<'_, EncryptionConfigCache>,
    host_id: i64,
) -> Result<CommandResponse<()>, String> {
    // 1. Abrir contexto de cifrado (obtiene la clave maestra)
    let (_pool, _cache, key) = match open_crypto_context(&app, &cache).await {
        Ok(ctx) => ctx,
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.context_failed",
                params!("reason" => e),
            ))
        }
    };

    // 2. Obtener la ruta de la base de datos desde el store de Tauri
    let db_path = match get_database_path_internal(app) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Ok(CommandResponse::err("hosts.errors.no_database_path", HashMap::new()));
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.store_error",
                params!("reason" => e),
            ));
        }
    };

    // 3. Obtener datos del host desde SQLite (con JOIN a passkeys si aplica)
    let mut host_data = match fetch_host_data(&db_path, host_id).await {
        Ok(Some(h)) => h,
        Ok(None) => {
            return Ok(CommandResponse::err(
                "hosts.errors.not_found",
                params!("id" => host_id.to_string()),
            ));
        }
        Err(e) => {
            return Ok(CommandResponse::err(
                "hosts.errors.database_error",
                params!("reason" => e),
            ));
        }
    };

    // 4. Descifrar credenciales
    if let Some(ref pwd) = host_data.password {
        if crypto::is_encrypted(pwd) {
            match crypto::decrypt(pwd, &key) {
                Ok(dec) => host_data.password = Some(dec),
                Err(e) => {
                    return Ok(CommandResponse::err(
                        "hosts.errors.decryption_failed",
                        params!("reason" => format!("Password decryption failed: {}", e)),
                    ));
                }
            }
        }
    }

    if let Some(ref kc) = host_data.key_content {
        if crypto::is_encrypted(kc) {
            match crypto::decrypt(kc, &key) {
                Ok(dec) => host_data.key_content = Some(dec),
                Err(e) => {
                    return Ok(CommandResponse::err(
                        "hosts.errors.decryption_failed",
                        params!("reason" => format!("Key content decryption failed: {}", e)),
                    ));
                }
            }
        }
    }

    if let Some(ref pp) = host_data.passphrase {
        if crypto::is_encrypted(pp) {
            match crypto::decrypt(pp, &key) {
                Ok(dec) => host_data.passphrase = Some(dec),
                Err(e) => {
                    return Ok(CommandResponse::err(
                        "hosts.errors.decryption_failed",
                        params!("reason" => format!("Passphrase decryption failed: {}", e)),
                    ));
                }
            }
        }
    }

    // 5. Intentar la conexión SSH con timeout global
    let addr = format!("{}:{}", host_data.host, host_data.port);

    let connection_result = timeout(
        Duration::from_secs(CONNECTION_TIMEOUT_SECS),
        attempt_ssh_connection(addr, host_data),
    )
    .await;

    match connection_result {
        Ok(Ok(())) => Ok(CommandResponse::ok_empty("hosts.success.connection")),
        Ok(Err(e)) => Ok(CommandResponse::err(
            "hosts.errors.connection_failed",
            params!("reason" => e),
        )),
        Err(_) => Ok(CommandResponse::err(
            "hosts.errors.connection_timeout",
            params!("timeout" => CONNECTION_TIMEOUT_SECS.to_string()),
        )),
    }
}

// ---------------------------------------------------------------------------
// Funciones auxiliares
// ---------------------------------------------------------------------------

/// Obtiene los datos del host desde la base de datos, haciendo JOIN con
/// `passkeys` cuando `auth_type = 'key'` para incluir el contenido de la clave.
async fn fetch_host_data(db_path: &str, host_id: i64) -> Result<Option<HostData>, String> {
    let url = path_to_sqlite_url(db_path);

    let options = SqliteConnectOptions::from_str(&url)
        .map_err(|e| e.to_string())?
        .read_only(true);

    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"
        SELECT
            h.host,
            h.port,
            COALESCE(h.username, '') AS username,
            h.auth_type,
            h.password,
            p.key_content,
            p.passphrase
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

    match row {
        None => Ok(None),
        Some(r) => Ok(Some(HostData {
            host: r.get("host"),
            port: r.get("port"),
            username: r.get("username"),
            auth_type: r.get("auth_type"),
            password: r.get("password"),
            key_content: r.get("key_content"),
            passphrase: r.get("passphrase"),
        })),
    }
}

/// Realiza la conexión SSH y autenticación según el `auth_type` del host.
/// Devuelve `Ok(())` si la autenticación fue exitosa, o un mensaje de error.
async fn attempt_ssh_connection(addr: String, host: HostData) -> Result<(), String> {
    let config = Arc::new(client::Config::default());

    // Conectar y realizar el handshake SSH
    let mut session = client::connect(config, addr, SshClientHandler)
        .await
        .map_err(|e| e.to_string())?;

    // Autenticar según el tipo configurado en el host
    let auth_result = match host.auth_type.as_str() {
        "password" => {
            let password = host.password.unwrap_or_default();
            session
                .authenticate_password(&host.username, password)
                .await
                .map_err(|e| e.to_string())?
        }
        "key" => {
            let key_content = host
                .key_content
                .ok_or_else(|| "No se encontró el contenido de la clave privada".to_string())?;

            // Parsear la clave privada desde el contenido almacenado en BD
            let private_key = PrivateKey::from_openssh(key_content.as_bytes())
                .map_err(|e| format!("Error al procesar la clave privada: {}", e))?;

            // Descifrar la passphrase si existe
            let private_key = if let Some(ref passphrase) = host.passphrase {
                private_key
                    .decrypt(passphrase.as_bytes())
                    .map_err(|e| format!("Error al descifrar la clave privada: {}", e))?
            } else {
                private_key
            };

            let key_with_hash = PrivateKeyWithHashAlg::new(Arc::new(private_key), None);

            session
                .authenticate_publickey(&host.username, key_with_hash)
                .await
                .map_err(|e| e.to_string())?
        }
        other => {
            return Err(format!("Tipo de autenticación no soportado: '{}'", other));
        }
    };

    // Verificar si la autenticación fue exitosa
    if !matches!(auth_result, russh::client::AuthResult::Success) {
        return Err("Autenticación rechazada por el servidor".to_string());
    }

    // Cerrar la sesión limpiamente
    session
        .disconnect(russh::Disconnect::ByApplication, "Test completado", "en")
        .await
        .ok();

    Ok(())
}
