use deployer_macros::DbEntity;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::commands::Patch;

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

// ============================================================================
// Entidad Host
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, TS, DbEntity)]
#[ts(export, export_to = "tauri-types.d.ts")]
#[db_table("deployer_hosts")]
pub struct Host {
    pub id: i64,
    pub name: String,
    pub host: String,
    pub port: i64,
    pub username: String,
    pub auth_type: AuthType,
    /// Cifrado siempre. El frontend nunca recibe este valor descifrado;
    /// solo la usa Rust internamente para SSH.
    #[db_encrypt]
    pub password: Option<String>,
    pub key_id: Option<i64>,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// Input para crear un Host
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct CreateHostInput {
    pub name: String,
    pub host: String,
    pub port: Option<i64>,
    pub username: String,
    pub auth_type: AuthType,
    pub password: Option<String>,
    pub key_id: Option<i64>,
    pub description: Option<String>,
    pub enabled: Option<bool>,
}

impl CreateHostInput {
    /// Convierte el input en una entidad `Host` lista para insertar.
    /// Los campos `id`, `created_at` y `updated_at` se gestionan por SQLite.
    pub fn into_host(self) -> Host {
        Host {
            id: 0,
            name: self.name,
            host: self.host,
            port: self.port.unwrap_or(22),
            username: self.username,
            auth_type: self.auth_type,
            password: self.password,
            key_id: self.key_id,
            description: self.description,
            enabled: self.enabled.unwrap_or(true),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

// ============================================================================
// Input para actualizar un Host
// ============================================================================

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "tauri-types.d.ts")]
pub struct UpdateHostInput {
    #[ts(optional)]
    pub name: Option<String>,
    #[ts(optional)]
    pub host: Option<String>,
    #[ts(optional)]
    pub port: Option<i64>,
    #[ts(optional)]
    pub username: Option<String>,
    #[ts(optional)]
    pub auth_type: Option<AuthType>,
    /// `Unset` = no modificar; `Null` = eliminar la contraseña; `Value(v)` = cifrar y guardar.
    #[serde(default)]
    #[ts(optional = nullable)]
    pub password: Patch<String>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub key_id: Patch<i64>,
    #[serde(default)]
    #[ts(optional = nullable)]
    pub description: Patch<String>,
    #[ts(optional)]
    pub enabled: Option<bool>,
}
