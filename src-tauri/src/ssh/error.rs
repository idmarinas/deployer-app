use std::collections::HashMap;

use crate::response::CommandResponse;

/// Claves i18n de la capa SSH. Todas las conexiones, ejecuciones y
/// transferencias las emiten desde aquí para que no estén repartidas entre
/// `tauri.hosts.*`, `tauri.remote.*` y `tauri.passkeys.*`.
pub mod keys {
    pub const CONNECTION_FAILED: &str = "tauri.ssh.errors.connection_failed";
    pub const CONNECTION_TIMEOUT: &str = "tauri.ssh.errors.connection_timeout";
    pub const CANCELLED: &str = "tauri.ssh.errors.cancelled";
    pub const EXECUTION_FAILED: &str = "tauri.ssh.errors.execution_failed";
    pub const TRANSFER_FAILED: &str = "tauri.ssh.errors.transfer_failed";
    pub const HOST_KEY_MISMATCH: &str = "tauri.ssh.errors.host_key_mismatch";
    pub const HOST_KEY_UNKNOWN: &str = "tauri.ssh.errors.host_key_unknown";
    pub const AUTHORIZED_KEYS_NOT_FOUND: &str = "tauri.ssh.errors.authorized_keys_not_found";
    pub const PUBLIC_KEY_NOT_IN_AUTHORIZED_KEYS: &str =
        "tauri.ssh.errors.public_key_not_in_authorized_keys";

    pub const CONNECTION_OK: &str = "tauri.ssh.success.connection";
    pub const EXEC_OK: &str = "tauri.ssh.success.exec";
    pub const UPLOAD_OK: &str = "tauri.ssh.success.upload";
    pub const DOWNLOAD_OK: &str = "tauri.ssh.success.download";
    pub const LIST_OK: &str = "tauri.ssh.success.list";
    pub const BATCH_OK: &str = "tauri.ssh.success.batch";
    pub const EXEC_COMPLETED_WITH_ERRORS: &str = "tauri.ssh.exec.completed_with_errors";
}

/// Fallo de bajo nivel al establecer una conexión SSH.
#[derive(Debug)]
pub(crate) enum ConnectionFailure {
    /// El servidor presentó una clave distinta de la esperada (o aún no hay
    /// ninguna huella confirmada para el host).
    HostKey {
        observed: String,
        expected: Option<String>,
    },
    /// Se agotó el plazo de conexión.
    Timeout,
    /// Cualquier otro fallo de red o autenticación.
    Other(String),
}

/// Error de la capa SSH con su clave i18n y sus parámetros ya resueltos.
/// Los comandos solo lo reenvían a `CommandResponse`.
#[derive(Debug, Clone)]
pub struct SshError {
    pub key: &'static str,
    pub params: HashMap<String, String>,
}

impl SshError {
    pub fn new(key: &'static str) -> Self {
        Self {
            key,
            params: HashMap::new(),
        }
    }

    pub fn with_param(key: &'static str, name: &str, value: impl Into<String>) -> Self {
        let mut params = HashMap::new();
        params.insert(name.to_string(), value.into());
        Self { key, params }
    }

    pub fn connection_failed(reason: impl Into<String>) -> Self {
        Self::with_param(keys::CONNECTION_FAILED, "reason", reason)
    }

    pub fn execution_failed(reason: impl Into<String>) -> Self {
        Self::with_param(keys::EXECUTION_FAILED, "reason", reason)
    }

    pub fn transfer_failed(reason: impl Into<String>) -> Self {
        Self::with_param(keys::TRANSFER_FAILED, "reason", reason)
    }

    pub fn cancelled() -> Self {
        Self::with_param(
            keys::CANCELLED,
            "reason",
            crate::ssh::transfer::CANCELLED_MSG,
        )
    }

    /// Texto legible para el evento `error` del Channel cuando no hay razón
    /// explícita (p. ej. discrepancia de huella).
    pub fn display_message(&self) -> &str {
        self.params
            .get("reason")
            .or_else(|| self.params.get("fingerprint"))
            .map(String::as_str)
            .unwrap_or(self.key)
    }

    pub fn is_host_key(&self) -> bool {
        self.key == keys::HOST_KEY_MISMATCH || self.key == keys::HOST_KEY_UNKNOWN
    }
}

impl From<ConnectionFailure> for SshError {
    fn from(failure: ConnectionFailure) -> Self {
        match failure {
            ConnectionFailure::HostKey { observed, expected } => {
                let key = if expected.is_some() {
                    keys::HOST_KEY_MISMATCH
                } else {
                    keys::HOST_KEY_UNKNOWN
                };
                Self::with_param(key, "fingerprint", observed)
            }
            ConnectionFailure::Timeout => Self::with_param(
                keys::CONNECTION_TIMEOUT,
                "timeout",
                super::session::SSH_CONNECT_TIMEOUT_SECS.to_string(),
            ),
            ConnectionFailure::Other(reason) => Self::connection_failed(reason),
        }
    }
}

/// Construye una respuesta de error de la capa SSH lista para devolver al frontend.
pub fn err_response<T>(error: SshError) -> Result<CommandResponse<T>, String> {
    Ok(CommandResponse::err(error.key, error.params))
}
