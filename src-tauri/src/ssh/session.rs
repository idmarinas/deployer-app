use russh::client;
use russh::keys::{HashAlg, PrivateKey, PrivateKeyWithHashAlg, PublicKeyOrCertificate};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::timeout;

use crate::commands::hosts::types::AuthType;
use crate::crypto;
use crate::crypto::StrongholdVault;
use crate::ssh::error::{ConnectionFailure, SshError};

/// Única fuente de verdad del plazo de conexión SSH (segundos).
/// Los comandos no añaden timeouts externos: esta capa reporta el error.
pub(crate) const SSH_CONNECT_TIMEOUT_SECS: u64 = 15;

/// Handler SSH que verifica la clave del servidor contra la huella guardada
/// en el host. Anota siempre la huella vista para poder mostrarla cuando el
/// host aún no tiene ninguna confirmada o cuando ha cambiado.
pub(crate) struct SshClientHandler {
    expected_fingerprint: Option<String>,
    observed_fingerprint: Arc<Mutex<Option<String>>>,
}

impl client::Handler for SshClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &PublicKeyOrCertificate,
    ) -> Result<bool, Self::Error> {
        let fingerprint = server_public_key
            .public_key()
            .fingerprint(HashAlg::Sha256)
            .to_string();

        if let Ok(mut observed) = self.observed_fingerprint.lock() {
            *observed = Some(fingerprint.clone());
        }

        Ok(self.expected_fingerprint.as_deref() == Some(fingerprint.as_str()))
    }
}

/// Datos mínimos de credenciales SSH de un host, descifrados y listos para conectar.
pub struct HostCredentials {
    pub host: String,
    pub port: i64,
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
}

/// Datos de credenciales SSH ya descifrados, listos para autenticar.
#[derive(Clone)]
pub struct SshCredentials {
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
    pub key_content: Option<String>,
    pub passphrase: Option<String>,
}

/// Sesión SSH activa con reconexión automática.
pub struct SshSession {
    pub(crate) handle: client::Handle<SshClientHandler>,
    pub addr: String,
    pub credentials: SshCredentials,
    pub max_reconnect_attempts: u32,
    /// Huella confirmada del host; se reutiliza en cada reconexión.
    expected_fingerprint: Option<String>,
}

impl SshSession {
    /// Establece una nueva conexión SSH, verifica la clave del servidor y autentica.
    pub async fn connect(
        addr: String,
        credentials: SshCredentials,
        max_reconnect_attempts: u32,
        expected_fingerprint: Option<String>,
    ) -> Result<Self, SshError> {
        let handle = connect_and_auth(&addr, &credentials, expected_fingerprint.as_deref()).await?;
        Ok(Self {
            handle,
            addr,
            credentials,
            max_reconnect_attempts,
            expected_fingerprint,
        })
    }

    /// Verifica si la sesión sigue activa y reconecta si es necesario.
    /// Realiza hasta `max_reconnect_attempts` intentos con backoff lineal de 2s.
    pub async fn ensure_connected(&mut self) -> Result<(), SshError> {
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

            match connect_and_auth(
                &self.addr,
                &self.credentials,
                self.expected_fingerprint.as_deref(),
            )
            .await
            {
                Ok(new_handle) => {
                    self.handle = new_handle;
                    return Ok(());
                }
                Err(e @ ConnectionFailure::HostKey { .. }) => return Err(SshError::from(e)),
                Err(e) if attempt < self.max_reconnect_attempts => {
                    let _ = e;
                    continue;
                }
                Err(e) => return Err(SshError::from(e)),
            }
        }

        Err(SshError::connection_failed(format!(
            "No se pudo reconectar tras {} intentos",
            self.max_reconnect_attempts
        )))
    }

    /// Cierra la sesión SSH limpiamente.
    pub async fn disconnect(self) {
        self.handle
            .disconnect(russh::Disconnect::ByApplication, "Sesión cerrada", "en")
            .await
            .ok();
    }
}

/// Descifra las credenciales del host usando el vault de Stronghold.
pub(crate) fn decrypt_host_credentials(
    host: &HostCredentials,
    key_content: Option<String>,
    passphrase: Option<String>,
    vault: &StrongholdVault,
) -> Result<SshCredentials, String> {
    let password = match &host.password {
        Some(pwd) if crypto::is_encrypted(pwd) => Some(
            vault
                .decrypt_value("encrypt:deployer_hosts.password", pwd)
                .map_err(|e| format!("Error al descifrar contraseña del host: {}", e))?,
        ),
        other => other.clone(),
    };

    let key_content = match key_content {
        Some(kc) if crypto::is_encrypted(&kc) => Some(
            vault
                .decrypt_value("encrypt:deployer_passkeys.key_content", &kc)
                .map_err(|e| format!("Error al descifrar clave privada: {}", e))?,
        ),
        other => other,
    };

    let passphrase = match passphrase {
        Some(pp) if crypto::is_encrypted(&pp) => Some(
            vault
                .decrypt_value("encrypt:deployer_passkeys.passphrase", &pp)
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
    expected_fingerprint: Option<&str>,
) -> Result<client::Handle<SshClientHandler>, ConnectionFailure> {
    let observed = Arc::new(Mutex::new(None));
    let handler = SshClientHandler {
        expected_fingerprint: expected_fingerprint.map(str::to_string),
        observed_fingerprint: Arc::clone(&observed),
    };
    let config = Arc::new(client::Config::default());

    let handle = timeout(
        Duration::from_secs(SSH_CONNECT_TIMEOUT_SECS),
        client::connect(config, addr, handler),
    )
    .await
    .map_err(|_| ConnectionFailure::Timeout)?
    .map_err(|e| classify_connect_error(e, &observed, expected_fingerprint))?;

    authenticate(handle, credentials)
        .await
        .map_err(ConnectionFailure::Other)
}

/// Si el handler vio una clave del servidor, el fallo viene de la verificación
/// de huella; si no, es un fallo de red o de intercambio de claves.
fn classify_connect_error(
    error: russh::Error,
    observed: &Arc<Mutex<Option<String>>>,
    expected_fingerprint: Option<&str>,
) -> ConnectionFailure {
    let seen = observed.lock().ok().and_then(|guard| guard.clone());

    if let Some(fingerprint) = seen {
        ConnectionFailure::HostKey {
            observed: fingerprint,
            expected: expected_fingerprint.map(str::to_string),
        }
    } else {
        ConnectionFailure::Other(format!("Error de conexión SSH: {}", error))
    }
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

            let rsa_hash = handle
                .best_supported_rsa_hash()
                .await
                .map_err(|e| format!("Error al negociar algoritmo RSA: {}", e))?
                .flatten();

            let key_with_hash = PrivateKeyWithHashAlg::new(Arc::new(private_key), rsa_hash);
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
