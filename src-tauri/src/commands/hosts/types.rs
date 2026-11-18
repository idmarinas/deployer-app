use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ============================================================================
// Enum AuthType
// ============================================================================

/// Tipo de autenticación SSH soportado por la aplicación.
/// Solo puede ser `password` (contraseña) o `key` (clave privada).
#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type, Default)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
#[ts(export, export_to = "tauri-types.d.ts")]
pub enum AuthType {
    #[default]
    Password,
    Key,
}

impl std::fmt::Display for AuthType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthType::Password => write!(f, "password"),
            AuthType::Key => write!(f, "key"),
        }
    }
}

impl std::str::FromStr for AuthType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "password" => Ok(AuthType::Password),
            "key" => Ok(AuthType::Key),
            other => Err(format!("Tipo de autenticación no válido: '{}'", other)),
        }
    }
}

// Nota: el tipo del JSON de `system_info` vive en `src/types/entities.ts`
// (`HostSystemInfo`); Rust no construye ni exporta ese tipo.
