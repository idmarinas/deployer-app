use russh::client;
use russh::keys::{PrivateKey, PrivateKeyWithHashAlg};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

use crate::commands::hosts::types::{AuthType, Host};
use crate::crypto;

/// Timeout por defecto para el establecimiento de la conexión SSH (segundos).
const CONNECT_TIMEOUT_SECS: u64 = 15;

/// Handler SSH mínimo: acepta cualquier clave de servidor.
pub struct SshClientHandler;

impl client::Handler for SshClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

/// Datos de credenciales SSH ya descifrados, listos para autenticar.
pub struct SshCredentials {
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
    pub key_content: Option<String>,
    pub passphrase: Option<String>,
}

/// Sesión SSH activa con reconexión automática.
pub struct SshSession {
    pub handle: client::Handle<SshClientHandler>,
    pub addr: String,
    pub credentials: SshCredentials,
    pub max_reconnect_attempts: u32,
}

impl SshSession {
    /// Establece una nueva conexión SSH y autentica.
    pub async fn connect(
        addr: String,
        credentials: SshCredentials,
        max_reconnect_attempts: u32,
    ) -> Result<Self, String> {
        let handle = connect_and_auth(&addr, &credentials).await?;
        Ok(Self {
            handle,
            addr,
            credentials,
            max_reconnect_attempts,
        })
    }

    /// Verifica si la sesión sigue activa y reconecta si es necesario.
    /// Realiza hasta `max_reconnect_attempts` intentos con backoff lineal de 2s.
    pub async fn ensure_connected(&mut self) -> Result<(), String> {
        match self.handle.channel_open_session().await {
            Ok(ch) => {
                let _ = ch.eof().await;
                return Ok(());
            }
            Err(_) => {}
        }

        for attempt in 1..=self.max_reconnect_attempts {
            let wait = Duration::from_secs(2 * attempt as u64);
            tokio::time::sleep(wait).await;

            match connect_and_auth(&self.addr, &self.credentials).await {
                Ok(new_handle) => {
                    self.handle = new_handle;
                    return Ok(());
                }
                Err(_) if attempt < self.max_reconnect_attempts => continue,
                Err(e) => {
                    return Err(format!(
                        "No se pudo reconectar tras {} intentos: {}",
                        self.max_reconnect_attempts, e
                    ))
                }
            }
        }

        Err(format!(
            "No se pudo reconectar tras {} intentos",
            self.max_reconnect_attempts
        ))
    }

    /// Cierra la sesión SSH limpiamente.
    pub async fn disconnect(self) {
        self.handle
            .disconnect(russh::Disconnect::ByApplication, "Sesión cerrada", "en")
            .await
            .ok();
    }
}

/// Descifra las credenciales del host usando la clave maestra.
pub fn decrypt_host_credentials(
    host: &Host,
    key_content: Option<String>,
    passphrase: Option<String>,
    master_key: &[u8],
) -> Result<SshCredentials, String> {
    let password = match &host.password {
        Some(pwd) if crypto::is_encrypted(pwd) => Some(
            crypto::decrypt(pwd, master_key)
                .map_err(|e| format!("Error al descifrar contraseña del host: {}", e))?,
        ),
        other => other.clone(),
    };

    let key_content = match key_content {
        Some(kc) if crypto::is_encrypted(&kc) => Some(
            crypto::decrypt(&kc, master_key)
                .map_err(|e| format!("Error al descifrar clave privada: {}", e))?,
        ),
        other => other,
    };

    let passphrase = match passphrase {
        Some(pp) if crypto::is_encrypted(&pp) => Some(
            crypto::decrypt(&pp, master_key)
                .map_err(|e| format!("Error al descifrar passphrase: {}", e))?,
        ),
        other => other,
    };

    Ok(SshCredentials {
        username: host.username.clone(),
        auth_type: host.auth_type.clone(),
        password,
        key_content,
        passphrase,
    })
}

// ── Funciones internas ────────────────────────────────────────────────────────

async fn connect_and_auth(
    addr: &str,
    credentials: &SshCredentials,
) -> Result<client::Handle<SshClientHandler>, String> {
    let config = Arc::new(client::Config::default());

    let handle = timeout(
        Duration::from_secs(CONNECT_TIMEOUT_SECS),
        client::connect(config, addr, SshClientHandler),
    )
    .await
    .map_err(|_| format!("Timeout al conectar con {}", addr))?
    .map_err(|e| format!("Error de conexión SSH: {}", e))?;

    authenticate(handle, credentials).await
}

async fn authenticate(
    mut handle: client::Handle<SshClientHandler>,
    credentials: &SshCredentials,
) -> Result<client::Handle<SshClientHandler>, String> {
    let auth_result = match credentials.auth_type {
        AuthType::Password => {
            let password = credentials.password.clone().unwrap_or_default();
            handle
                .authenticate_password(&credentials.username, password)
                .await
                .map_err(|e| format!("Error en autenticación por contraseña: {}", e))?
        }
        AuthType::Key => {
            let key_content = credentials
                .key_content
                .as_deref()
                .ok_or_else(|| "No se encontró el contenido de la clave privada".to_string())?;

            let private_key = PrivateKey::from_openssh(key_content.as_bytes())
                .map_err(|e| format!("Error al procesar la clave privada: {}", e))?;

            let private_key = if let Some(ref passphrase) = credentials.passphrase {
                match private_key.decrypt(passphrase.as_bytes()) {
                    Ok(decrypted) => decrypted,
                    Err(e) if e.to_string().contains("already decrypted") => private_key,
                    Err(e) => {
                        return Err(format!("Error al descifrar la clave privada: {}", e));
                    }
                }
            } else {
                private_key
            };

            let key_with_hash = PrivateKeyWithHashAlg::new(Arc::new(private_key), None);
            handle
                .authenticate_publickey(&credentials.username, key_with_hash)
                .await
                .map_err(|e| format!("Error en autenticación por clave: {}", e))?
        }
    };

    if !matches!(auth_result, russh::client::AuthResult::Success) {
        return Err("Autenticación rechazada por el servidor SSH".to_string());
    }

    Ok(handle)
}
